/* global chrome */
function generateHeaders(auth) {
	const headers = { Accept: 'application/json' };
	if (!auth) {
		return headers;
	}
	const hash = btoa(`${auth.username}:${auth.password}`);
	return {
		Authorization: `Basic ${hash}`,
		...headers
	};
}

// At this point you might want to think, WHY would you want to do
// these requests in a background page instead of the content script?
// This is because Movieo is served over HTTPS, so it won't accept requests to
// HTTP servers. Unfortunately, many people use CouchPotato over HTTP.
//function viewCouchpotato(request, sendResponse) {
//	fetch(`${request.url}?id=${request.imdbId}`, {
//		headers: generateHeaders(request.basicAuth),
//	})
//		.then(res => res.json())
//		.then(res => {
//			const success = res.success;
//			sendResponse({ success, status: success ? res.media.status : null });
//		})
//		.catch(err => {
//			sendResponse({ err: String(err) });
//		});
//}
//
//function addCouchpotato(request, sendResponse) {
//	fetch(`${request.url}?identifier=${request.imdbId}`, {
//		headers: generateHeaders(request.basicAuth),
//	})
//		.then(res => res.json())
//		.then(res => {
//			sendResponse({ success: res.success });
//		})
//		.catch(err => {
//			sendResponse({ err: String(err) });
//		});
//}

function addRadarr(request, sendResponse) {
	const headers = {
		...generateHeaders(request.basicAuth),
		'Content-Type': 'application/json',
		'X-Api-Key': request.radarrToken,
	};
	const lookupQuery = encodeURIComponent(`imdb:${request.imdbId}`);

	fetch(`${request.url}/lookup?term=${lookupQuery}`, { headers })
		.then(res => res.json())
		.then(data => {
			if (!Array.isArray(data) || data.length < 1) {
				throw new Error('Movie not found');
			}
			const body = {
				...data[0],
				monitored: true,
				minimumAvailability: 'preDB',
				qualityProfileId: request.radarrQualityProfileId,
				rootFolderPath: request.radarrStoragePath,
				addOptions: {
					searchForMovie: true,
				},
			};
			console.log('generated URL', request.url, headers);
			console.log('body', body);
			return body;
		})
		.then(body => {
			return fetch(request.url, {
				method: 'post',
				headers,
				body: JSON.stringify(body),
			});
		})
		.then(res => res.json())
		.then(res => {
			if (res && res[0] && res[0].errorMessage) {
				sendResponse({ err: res[0].errorMessage });
			} else if (res && res.path) {
				sendResponse({ success: 'Added to ' + res.path });
			} else {
				sendResponse({ err: 'Unknown error' });
			}
		})
		.catch(err => {
			sendResponse({ err: String(err) });
		});
}

function addSonarr(request, sendResponse) {
	const headers = {
		...generateHeaders(request.basicAuth),
		'Content-Type': 'application/json',
		'X-Api-Key': request.sonarrToken,
	};
	const lookupQuery = encodeURIComponent(`imdb:${request.imdbId}`);

	fetch(`${request.url}/lookup?term=${lookupQuery}`, { headers })
		.then(res => res.json())
		.then(data => {
			if (!Array.isArray(data) || data.length < 1) {
				throw new Error('TV Show not found');
			}
			const body = {
				...data[0],
				monitored: true,
				minimumAvailability: 'preDB',
				qualityProfileId: request.sonarrQualityProfileId,
				rootFolderPath: request.sonarrStoragePath,
				addOptions: {
					searchForSeries: true,
				},
			};
			console.log('generated URL', request.url, headers);
			console.log('body', body);
			return body;
		})
		.then(body => {
			return fetch(request.url, {
				method: 'post',
				headers,
				body: JSON.stringify(body),
			});
		})
		.then(res => res.json())
		.then(res => {
			if (res && res[0] && res[0].errorMessage) {
				sendResponse({ err: res[0].errorMessage });
			} else if (res && res.path) {
				sendResponse({ success: 'Added to ' + res.path });
			} else {
				sendResponse({ err: 'Unknown error' });
			}
		})
		.catch(err => {
			sendResponse({ err: String(err) });
		});
}

function _searchPlex(connection, headers, options) {
	const type = options.type || 'movie';
	const url = `${connection.uri}/hubs/search`;
	const field = options.field || 'title';

	// i.e. Letterboxd can contain special white-space characters. Plex doesn't like this.
	const title = encodeURIComponent(options.title.replace(/\s/g, ' '));
	const finalUrl = `${url}?query=${field}:${title}`;
	return fetch(finalUrl, {
		headers,
	})
		.then(res => res.json())
		.then(data => {
			const hub = data.MediaContainer.Hub.find(myHub => myHub.type === type);
			if (!hub || !hub.Metadata) {
				return { found: false };
			}

			// We only want to search in Plex libraries with the type "Movie", i.e. not the type "Other Videos".
			// Weirdly enough Plex doesn't seem to have an easy way to filter those libraries so we invent our own hack.
			const actualMovies = hub.Metadata.filter(
				meta =>
					meta.Country ||
					meta.Directory ||
					meta.Genre ||
					meta.Role ||
					meta.Writer
			);
			// This is messed up, but Plex' definition of a year is year when it was available,
			// not when it was released (which is Movieo's definition).
			// For examples, see Bone Tomahawk, The Big Short, The Hateful Eight.
			// So we'll first try to find the movie with the given year, and then + 1 it.
			let media = actualMovies.find(meta => meta.year === options.year);
			if (!media) {
				media = actualMovies.find(meta => meta.year === options.year + 1);
			}
			let key = null;
			if (media) {
				key = media.key.replace('/children', '');
			}

			return { found: !!media, key };
		});
}

// Unfortunately the native Promise.race does not work as you would suspect.
// If one promise (Plex request) fails, we still want the other requests to continue racing.
// See https://www.jcore.com/2016/12/18/promise-me-you-wont-use-promise-race/ for explanation
function promiseRace(promises) {
	if (promises.length < 1) {
		return Promise.reject('Cannot start a race without promises!');
	}

	// There is no way to know which promise is rejected.
	// So we map it to a new promise to return the index when it fails
	let indexPromises = promises.map((p, index) =>
		p.catch(() => {
			throw index;
		})
	);

	return Promise.race(indexPromises).catch(index => {
		// The promise has rejected, remove it from the list of promises and just continue the race.
		let p = promises.splice(index, 1)[0];
		p.catch(e => console.log(`Plex request ${index} failed:`, e));
		return promiseRace(promises);
	});
}

async function searchPlex(request, sendResponse) {
	const { options, serverConfig } = request;
	const headers = {
		'X-Plex-Token': serverConfig.token,
		Accept: 'application/json',
	};

	// Try all Plex connection urls.
	const requests = serverConfig.connections.map(conn =>
		_searchPlex(conn, headers, options)
	);
	try {
		// See what connection url finishes the request first and pick that one.
		// TODO: optimally, as soon as the first request is finished, all other requests would be cancelled using AbortController.
		const result = await promiseRace(requests);
		sendResponse(result);
	} catch (err) {
		sendResponse({ err: String(err) });
	}
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.type) {
		case 'SEARCH_PLEX':
			searchPlex(request, sendResponse);
			return true;
//		case 'VIEW_COUCHPOTATO':
//			viewCouchpotato(request, sendResponse);
//			return true;
//		case 'ADD_COUCHPOTATO':
//			addCouchpotato(request, sendResponse);
//			return true;
		case 'ADD_RADARR':
			addRadarr(request, sendResponse);
			return true;
		case 'ADD_SONARR':
			addSonarr(request, sendResponse);
			return true;
		case 'OPEN_OPTIONS':
			chrome.runtime.openOptionsPage();
			return true;
		default:
			return false;
	}
});

/* global parseXml */
// FireFox doesn't support sync storage.
const storage = chrome.storage.sync || chrome.storage.local;

const $selectServer = document.getElementById('plex_servers');
const $selectRadarrQualityProfile = document.querySelector(
	`[data-option="radarrQualityProfileId"]`
);
const $selectSonarrQualityProfile = document.querySelector(
	`[data-option="sonarrQualityProfileId"]`
);
const $saveButton = document.getElementById('save');
let plexServers = [];

const optionNames = [
	'plexToken',
//	'couchpotatoUrlRoot',
//	'couchpotatoToken',
//	'couchpotatoBasicAuthUsername',
//	'couchpotatoBasicAuthPassword',
	'radarrUrlRoot',
	'radarrToken',
	'radarrBasicAuthUsername',
	'radarrBasicAuthPassword',
	'radarrStoragePath',
	'radarrQualityProfileId',
	'sonarrUrlRoot',
	'sonarrToken',
	'sonarrBasicAuthUsername',
	'sonarrBasicAuthPassword',
	'sonarrStoragePath',
	'sonarrQualityProfileId'
];

function getServers(plexToken) {
	return fetch('https://plex.tv/api/resources?includeHttps=1', {
		headers: {
			'X-Plex-Token': plexToken,
		},
	})
		.then(res => res.text())
		.then(res => {
			const data = parseXml(res);
			if (data === 'Invalid authentication token.') {
				return null;
			}
			return data.Device.filter(device => device.provides === 'server');
		});
}

function getPlexConnections(server) {
	// `server.Connection` can be an array or object.
	let connections = [];
	if (Array.isArray(server.Connection)) {
		connections = server.Connection;
	} else {
		connections = [server.Connection];
	}
	return connections.map(conn => ({
		uri: conn.uri,
		local: conn.local === '1',
	}));
}

function performPlexTest(oldServerId) {
	const plexToken = document.getElementById('plex_token').value;
	const $testStatus = document.getElementById('plex_test_status');
	$selectServer.innerHTML = '';
	$testStatus.textContent = '';
	$saveButton.disabled = true;

	getServers(plexToken).then(servers => {
		plexServers = servers || [];
		if (!servers) {
			$testStatus.textContent = 'Invalid token.';
			return;
		}

		$saveButton.disabled = false;

		servers.forEach(server => {
			const $opt = document.createElement('option');
			const source = server.sourceTitle;
			$opt.value = server.clientIdentifier;
			$opt.textContent = `${server.name} ${source ? `(${source})` : ''}`;
			$selectServer.appendChild($opt);
		});
		if (oldServerId) {
			$selectServer.value = oldServerId;
		}
	});
}

function getOptionValues() {
	const values = {};
	optionNames.forEach(optionName => {
		values[optionName] = document.querySelector(
			`[data-option="${optionName}"]`
		).value;
	});
	return values;
}

function getRadarrProfiles(values) {
	const headers = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		'X-Api-Key': values.radarrToken,
	};
	if (values.radarrBasicAuthUsername) {
		const hash = btoa(
			`${values.radarrBasicAuthUsername}:${values.radarrBasicAuthPassword}`
		);
		headers.Authorization = `Basic ${hash}`;
	}
	return fetch(`${values.radarrUrlRoot}/api/profile`, { headers })
		.then(res => res.json())
		.catch(err => {
			console.log('Radarr failed to connect with error:', err);
			return [];
		});
}

function performRadarrTest(oldQualityProfileId) {
	const values = getOptionValues();
	const $testStatus = document.getElementById('radarr_test_status');
	$selectRadarrQualityProfile.innerHTML = '';
	$testStatus.textContent = '';

	getRadarrProfiles(values).then(profiles => {
		$testStatus.textContent =
			profiles.length > 0 ? 'It works!' : 'Could not connect.';
		profiles.forEach(profile => {
			const $opt = document.createElement('option');
			$opt.value = profile.id;
			$opt.textContent = profile.name;
			$selectRadarrQualityProfile.appendChild($opt);
		});
		// Because the <select> was reset, the original value is lost.
		if (oldQualityProfileId) {
			$selectRadarrQualityProfile.value = oldQualityProfileId;
		}
	});
}

function getSonarrProfiles(values) {
	const headers = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		'X-Api-Key': values.sonarrToken,
	};
	if (values.sonarrBasicAuthUsername) {
		const hash = btoa(
			`${values.sonarrBasicAuthUsername}:${values.sonarrBasicAuthPassword}`
		);
		headers.Authorization = `Basic ${hash}`;
	}
	return fetch(`${values.sonarrUrlRoot}/api/profile`, { headers })
		.then(res => res.json())
		.catch(err => {
			console.log('Sonarr failed to connect with error:', err);
			return [];
		});
}

function performSonarrTest(oldQualityProfileId) {
	const values = getOptionValues();
	const $testStatus = document.getElementById('sonarr_test_status');
	$selectSonarrQualityProfile.innerHTML = '';
	$testStatus.textContent = '';

	getSonarrProfiles(values).then(profiles => {
		$testStatus.textContent =
			profiles.length > 0 ? 'It works!' : 'Could not connect.';
		profiles.forEach(profile => {
			const $opt = document.createElement('option');
			$opt.value = profile.id;
			$opt.textContent = profile.name;
			$selectSonarrQualityProfile.appendChild($opt);
		});
		// Because the <select> was reset, the original value is lost.
		if (oldQualityProfileId) {
			$selectSonarrQualityProfile.value = oldQualityProfileId;
		}
	});
}

function saveOptions() {
	const status = document.getElementById('status');
	const selectedServerId =
		$selectServer.options[$selectServer.selectedIndex].value;
	if (!selectedServerId) {
		status.textContent = 'Select a server first!';
		return;
	}

	const server = plexServers.find(
		ser => ser.clientIdentifier === selectedServerId
	);

	console.log('Currently selected server information', JSON.stringify(server));

	if (!server) {
		// This _should_ never happen, but can be useful for debugging.
		status.textContent = 'Could not find Plex server by identifier.';
		return;
	}

	// Important detail: we get the token from the selected server, NOT the token the user has entered before.
	const serverToken = server.accessToken;
	const serverId = server.clientIdentifier;
	const serverConnections = getPlexConnections(server);
	console.log(
		'Found Plex Server connections:',
		JSON.stringify(serverConnections)
	);

	if (serverConnections.length < 1) {
		status.textContent = 'Could not find a Plex server URL.';
		return;
	}

	// With a "user token" you can access multiple servers. A "normal" token is just for one server.
	const values = getOptionValues();
	function testRootUrl(url) {
		return url && (!url.startsWith('http') || url.endsWith('/'));
	}

//	if (testRootUrl(values.couchpotatoUrlRoot)) {
//		status.textContent =
//			'CouchPotato URL should start with "http" and end without a slash!';
//		return;
//	}

	if (testRootUrl(values.radarrUrlRoot)) {
		status.textContent =
			'Radarr URL should start with "http" and end without a slash!';
		return;
	}

	if (values.radarrUrlRoot && !values.radarrQualityProfileId) {
		status.textContent =
			'Make sure you have selected a Radarr quality profile.';
		return;
	}

	if (values.radarrStoragePath && !/\/|\\$/.test(values.radarrStoragePath)) {
		status.textContent = 'Radarr storage path should end with a slash!';
		return;
	}

	if (testRootUrl(values.sonarrUrlRoot)) {
		status.textContent =
			'Sonarr URL should start with "http" and end without a slash!';
		return;
	}

	if (values.sonarrUrlRoot && !values.sonarrQualityProfileId) {
		status.textContent =
			'Make sure you have selected a Sonarr quality profile.';
		return;
	}

	if (values.sonarrStoragePath && !/\/|\\$/.test(values.sonarrStoragePath)) {
		status.textContent = 'Sonarr storage path should end with a slash!';
		return;
	}

	function requestUrlPermissions(url) {
		// TODO: FireFox doesn't have support for chrome.permissions API.
		if (url && chrome.permissions) {
			// When asking permissions the URL needs to have a trailing slash.
			chrome.permissions.request({
				origins: [`${url}/`],
			});
		}
	}

	// Dynamically asking permissions
//	requestUrlPermissions(values.couchpotatoUrlRoot);
	requestUrlPermissions(values.radarrUrlRoot);
	requestUrlPermissions(values.sonarrUrlRoot);

	function showOptionsSaved() {
		// Update status to let user know options were saved.
		status.textContent = 'Options saved.';
		setTimeout(() => {
			status.textContent = '';
		}, 750);
	}

	status.textContent = 'Saving…';

	const data = {
		...values,
		servers: [
			{
				id: serverId,
				token: serverToken,
				connections: serverConnections,
			},
		],
	};
	storage.set(data, () => {
		if (chrome.runtime.lastError) {
			console.log('Error with saving', chrome.runtime.lastError.message);
			chrome.storage.local.set(data, showOptionsSaved);
		} else {
			showOptionsSaved();
		}
	});
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
	function setOptions(items) {
		optionNames.forEach(optionName => {
			document.querySelector(`[data-option="${optionName}"]`).value =
				items[optionName] || '';
		});

		if (items.plexToken) {
			const serverId = items.servers ? items.servers[0].id : null;
			performPlexTest(serverId);
		}
		if (items.radarrUrlRoot) {
			performRadarrTest(items.radarrQualityProfileId);
		}
		if (items.sonarrUrlRoot) {
			performSonarrTest(items.sonarrQualityProfileId);
		}
	}
	storage.get(null, items => {
		// Sigh... This is a workaround for Firefox; newer versions do have support for the `chrome.storage.sync` API,
		// but it will throw an error if you haven't enabled that. ARGHHHHHHHHH.
		if (chrome.runtime.lastError) {
			chrome.storage.local.get(null, setOptions);
		} else {
			setOptions(items);
		}
	});
}
document.addEventListener('DOMContentLoaded', restoreOptions);
$saveButton.addEventListener('click', saveOptions);
document
	.getElementById('plex_test')
	.addEventListener('click', () => performPlexTest());
document
	.getElementById('radarr_test')
	.addEventListener('click', () => performRadarrTest());
document
	.getElementById('sonarr_test')
	.addEventListener('click', () => performSonarrTest());

/* global parseXML */
/* Notes:
	#1: See https://github.com/SpaceK33z/web-to-plex/commit/db01d1a83d32e4d73f2ea671f634e6cc5b4c0fe7
	#2: See https://github.com/SpaceK33z/web-to-plex/commit/27506b9a4c12496bd7aad6ee09deb8a5b9418cac
	#3: See https://github.com/SpaceK33z/web-to-plex/issues/21
	#4: See https://github.com/SpaceK33z/web-to-plex/issues/61
*/

let DEVELOPER_MODE;

if(chrome.runtime.lastError)
	/* Always causes errors on *nix machines, so just "poke" the errors here */
	chrome.runtime.lastError.message;

// FireFox doesn't support sync storage.
const storage = (chrome.storage.sync || chrome.storage.local),
		$ = (selector, all) => (all? document.querySelectorAll(selector): document.querySelector(selector)),
		__servers__ = $('[data-option="preferredServer"]'),
		__sickBeard_qualityProfile__  = $(`[data-option="sickBeardQualityProfileId"]`),
		__sickBeard_storagePath__     = $(`[data-option="sickBeardStoragePath"]`),
		__medusa_qualityProfile__     = $(`[data-option="medusaQualityProfileId"]`),
		__medusa_storagePath__        = $(`[data-option="medusaStoragePath"]`),
		__watcher_qualityProfile__    = $(`[data-option="watcherQualityProfileId"]`),
		__watcher_storagePath__       = $(`[data-option="watcherStoragePath"]`),
		__radarr_qualityProfile__     = $(`[data-option="radarrQualityProfileId"]`),
		__radarr_storagePath__        = $(`[data-option="radarrStoragePath"]`),
		__sonarr_qualityProfile__     = $(`[data-option="sonarrQualityProfileId"]`),
		__sonarr_storagePath__        = $(`[data-option="sonarrStoragePath"]`),
		__save__ = $('#save'),
		__options__ = [
			/* Plex Settings */
			'plexURL',
			'plexToken',
			'UseOmbi',
			'preferredServer',

			/* Manager Settings */
			// Ombi
			'usingOmbi',
			'ombiURLRoot',
			'ombiToken',

			// Medusa
			'usingMedusa',
			'medusaURLRoot',
			'medusaToken',
			'medusaBasicAuthUsername',
			'medusaBasicAuthPassword',
			'medusaStoragePath',
			'medusaQualityProfileId',

			// Watcher
			'usingWatcher',
			'watcherURLRoot',
			'watcherToken',
			'watcherBasicAuthUsername',
			'watcherBasicAuthPassword',
			'watcherStoragePath',
			'watcherQualityProfileId',

			// Radarr
			'usingRadarr',
			'radarrURLRoot',
			'radarrToken',
			'radarrBasicAuthUsername',
			'radarrBasicAuthPassword',
			'radarrStoragePath',
			'radarrQualityProfileId',

			// Sonarr
			'usingSonarr',
			'sonarrURLRoot',
			'sonarrToken',
			'sonarrBasicAuthUsername',
			'sonarrBasicAuthPassword',
			'sonarrStoragePath',
			'sonarrQualityProfileId',

			// Sick Beard
			'usingSickBeard',
			'sickBeardURLRoot',
			'sickBeardToken',
			'sickBeardBasicAuthUsername',
			'sickBeardBasicAuthPassword',
			'sickBeardStoragePath',
			'sickBeardQualityProfileId',

			// CouchPotato
			'enableCouchPotato',
			'usingCouchPotato',
			'couchpotatoURLRoot',
			'couchpotatoToken',
			'couchpotatoBasicAuthUsername',
			'couchpotatoBasicAuthPassword',
			// 'couchpotatoQualityProfileId',

			/* Other Settings */
			// Connection settings
			'UseProxy',
			'ProxyURL',
			'ProxyHeaders',

			// Media settings
			'UseAutoGrab',
			'AutoGrabLimit',
			'PromptLocation',
			'PromptQuality',

			// Notification Settings
			'NotifyNewOnly',
			'NotifyOnlyOnce',

			// Search Settings
			'UseLoose',
			'UseLooseScore',
			'ManagerSearch',

			// Advance Settings
			'OMDbAPI',
			'TMDbAPI',
			'DeveloperMode',

			// Hidden values
			'watcherQualities',
			'radarrQualities',
			'sonarrQualities',
			'medusaQualities',
			'sickBeardQualities',
			'watcherStoragePaths',
			'radarrStoragePaths',
			'sonarrStoragePaths',
			'medusaStoragePaths',
			'sickBeardStoragePaths',
			'__radarrQuality',
			'__sonarrQuality',
			'__medusaQuality',
			'__sickBeardQuality',
			'__radarrStoragePath',
			'__sonarrStoragePath',
			'__medusaStoragePath',
			'__sickBeardStoragePath',
			'__domains',
			'__caught',
			'__theme',

			// Builtins - End of file, "let builtins ="
			'builtin_allocine',
			'builtin_amazon',
			'builtin_couchpotato',
			'builtin_fandango',
			'builtin_flickmetrix',
			'builtin_google',
			'builtin_googleplay',
			'builtin_hulu',
			'builtin_imdb',
			'builtin_justwatch',
			'builtin_letterboxd',
			'builtin_metacritic',
			'builtin_moviemeter',
			'builtin_movieo',
			'builtin_netflix',
			'builtin_plex',
			'builtin_rottentomatoes',
			'builtin_shanaproject',
			'builtin_showrss',
			'builtin_tmdb',
			'builtin_tvmaze',
			'builtin_tvdb',
			'builtin_trakt',
			'builtin_vrv',
			'builtin_verizon',
			'builtin_vudu',
			'builtin_vumoo',
			'builtin_youtube',
			'builtin_itunes',
			'builtin_gostream',
			'builtin_tubi',
			'builtin_webtoplex',

			// Plugins - End of file, "let plugins ="
			'plugin_toloka',
			'plugin_shanaproject',
			'plugin_myanimelist',
			'plugin_myshows',
			'plugin_indomovie',
			'plugin_redbox',
			'plugin_kitsu',
			'plugin_go',
			'plugin_snagfilms',
			'plugin_freemoviescinema',
		];

let PlexServers = [],
	ServerID = null,
	ClientID = null,
	manifest = chrome.runtime.getManifest(),
	terminal = // See #3
		(DEVELOPER_MODE = $('[data-option="DeveloperMode"]').checked)?
			console:
		{ error: m => m, info: m => m, log: m => m, warn: m => m, group: m => m, groupEnd: m => m };

chrome.manifest = manifest;

// Not really important variables
// The "caught" IDs (already asked for in managers)
let __caught = {
	imdb: [],
	tmdb: [],
	tvdb: [],
},
// The theme classes
	__theme = [];

// create and/or queue a notification
// state = "error" - red
// state = "update" - blue
// state = "info" - grey
// anything else for state will show as orange
class Notification {
	constructor(state, text, timeout = 7000, callback = () => {}, requiresClick = true) {
		let queue = (Notification.queue = Notification.queue || { list: [] }),
			last = queue.list[queue.list.length - 1];

		if (last && last.done === false)
			return (last => setTimeout(() => new Notification(state, text, timeout, callback, requiresClick), +(new Date) - last.start))(last);

		let element = document.furnish(`div.notification.${state}`, {
			onclick: event => {
				let notification = Notification.queue[event.target.id],
					element = notification.element;

				notification.done = true;
				Notification.queue.list.splice(notification.index, 1);
				clearTimeout(notification.job);
				element.remove();

				let removed = delete Notification.queue[notification.id];

				return (event.requiresClick)? null: notification.callback(removed);
			}
		}, text);

		queue[element.id = +(new Date)] = {
			start: +element.id,
			stop:  +element.id + timeout,
			span:  +timeout,
			done:  false,
			index: queue.list.length,
			job:   setTimeout(() => element.onclick({ target: element, requiresClick }), timeout),
			id:    +element.id,
			callback, element
		};
		queue.list.push(queue[element.id]);

		document.body.appendChild(element);

		return queue[element.id];
	}
}

class Prompt {
	constructor(type, options, callback = () => {}, container = document.body) {
		let prompt, remove, create,
			array = (options instanceof Array? options: [].slice.call(options)),
			data = [...array];

		switch(type) {
			/* Allows the user to add and remove items from a list */
			case 'prompt':
			case 'input':
				remove = element => {
					let prompter = document.querySelector('.prompt'),
						header = document.querySelector('.prompt-header'),
						counter = document.querySelector('.prompt-options');

					if(element === true)
						return prompter.remove();
					else
						element.remove();

					data.splice(+element.value, 1, null);
					header.innerText = 'Approve ' + counter.children.length + (counter.children.length == 1?' item': ' items');
				};

				prompt = document.furnish('div.prompt', {},
					document.furnish('div.prompt-body', {},
						// The prompt's title
						document.furnish('h1.prompt-header', {}, 'Approve ' + array.length + (array.length == 1? ' item': ' items')),

						// The prompt's items
						document.furnish('div.prompt-options', {},
							...(create = ITEMS => {
								let elements = [];

								for(let index = 0, length = ITEMS.length, ITEM; index < length; index++)
									ITEM = ITEMS[index],
									elements.push(
										document.furnish('li.prompt-option.mutable', { value: index },
											JSON.stringify(ITEM),
											document.furnish('button', { title: 'Remove', onclick: event => { remove(event.target.parentElement); event.target.remove() } })
										)
									);

								return elements
							})(array)
						),

						// The engagers
						document.furnish('div.prompt-footer', {},
							document.furnish('input.prompt-input[type=text]', { placeholder: 'Add an item (enter to add)', onkeydown: event => {
								let self = event.target;

								if (event.keyCode === 13) {
									event.preventDefault();
									remove(true);

									let value = self.value;

									try {
										value = JSON.parse(value);
									} catch(error) {
										/* Suppress input errors */
									}

									new Prompt(type, [value, ...data.filter(value => value !== null && value !== undefined)], callback, container);
								}
							} }),
							document.furnish('button.prompt-decline', { onclick: event => { remove(true); callback([]) } }, 'Close'),
							document.furnish('button.prompt-accept', { onclick: event => { remove(true); new Prompt(type, options, callback, container) } }, 'Reset'),
							document.furnish('button.prompt-accept', { onclick: event => { remove(true); callback(data.filter(value => value !== null && value !== undefined)) } }, 'Continue')
						)
					)
				);
				break;

			/* Allows the user to remove predetermined items */
			case 'select':
				remove = element => {
					let prompter = document.querySelector('.prompt'),
						header = document.querySelector('.prompt-header'),
						counter = document.querySelector('.prompt-options');

					if(element === true)
						return prompter.remove();
					else
						element.remove();

					data.splice(+element.value, 1, null);
					header.innerText = 'Approve ' + counter.children.length + (counter.children.length == 1?' item': ' items');
				};

				prompt = document.furnish('div.prompt', {},
					document.furnish('div.prompt-body', {},
						// The prompt's title
						document.furnish('h1.prompt-header', {}, 'Approve ' + array.length + (array.length == 1? ' item': ' items')),

						// The prompt's items
						document.furnish('div.prompt-options', {},
							...(create = ITEMS => {
								let elements = [];

								for(let index = 0, length = ITEMS.length, ITEM; index < length; index++)
									ITEM = ITEMS[index],
									elements.push(
										document.furnish('li.prompt-option.mutable', { value: index },
											JSON.stringify(ITEM),
											document.furnish('button', { title: 'Remove', onclick: event => { remove(event.target.parentElement); event.target.remove() } })
										)
									);

								return elements
							})(array)
						),

						// The engagers
						document.furnish('div.prompt-footer', {},
							document.furnish('button.prompt-decline', { onclick: event => { remove(true); callback([]) } }, 'Close'),
							document.furnish('button.prompt-accept', { onclick: event => { remove(true); new Prompt(type, options, callback, container) } }, 'Reset'),
							document.furnish('button.prompt-accept', { onclick: event => { remove(true); callback(data.filter(value => value !== null && value !== undefined)) } }, 'Continue')
						)
					)
				);
				break;

			default:
				return terminal.warn(`Unknown prompt type "${ type }"`);
				break;
		}

		return container.append(prompt), prompt;
	}
}

function load(name) {
	return JSON.parse(localStorage.getItem(btoa(name)));
}

function save(name, data) {
	return localStorage.setItem(btoa(name), JSON.stringify(data));
}

function getServers(plexToken) {
	return fetch('https://plex.tv/api/resources?includeHttps=1', {
		headers: {
			'X-Plex-Token': plexToken
		}
	})
	.then(response => response.text())
	.then(xml => {
		let data = parseXML(xml);

		if(/^\s*Invalid/i.test(data))
			return null;

		return data.Device.filter(device => !!~device.provides.split(',').indexOf('server'));
	});
}

/* See #1 */
function tryPlexLogin(username, password) {
	let hash = btoa(`${username}:${password}`);

	return fetch(`https://plex.tv/users/sign_in.json`, {
		method: 'POST',
		headers: {
			'X-Plex-Product': 'Web to Plex',
			'X-Plex-Version': manifest.version,
			'X-Plex-Client-Identifier': ClientID,
			'Authorization': `Basic ${ hash }`
		}
	})
	.then(response => response.json());
}

function performPlexLogin() {
	let u = $('#plex_username').value,
		p = $('#plex_password').value,
		s = $('#plex_test_status');

	s.title = '';
	__servers__.innerHTML = '';
	__save__.disabled = true;

	tryPlexLogin(u, p)
		.then(response => {
			if(response.error)
				return s.title = 'Invalid login information', null;

			if(response.user) {
				let t = $('#plex_token');

				ClientID = t.value = t.textContent = response.user.authToken;

				return performPlexTest();
			}
		});
}

function performPlexTest(ServerID) {
	let plexToken = $('#plex_token').value,
		teststatus = $('#plex_test_status'),
<<<<<<< Updated upstream
		inusestataus = [...$('[in-use="plex_token"]', true)];
=======
		inusestatus = [...$('[in-use="plex_token"]', true)];
>>>>>>> Stashed changes

	__save__.disabled = true;
	__servers__.innerHTML = '';
	teststatus.textContent = '?';

<<<<<<< Updated upstream
	getServers(plexToken).then(servers => {
		PlexServers = servers || [];
		teststatus.textContent = '!';
		inusestataus.map(e => e.setAttribute('in-use', false));

		if(!servers)
			return teststatus.title = 'Failed to communicate with Plex', teststatus.classList = false;
		inusestataus.map(e => e.setAttribute('in-use', true));
=======
	getServers(plexToken).then((servers = []) => {
		PlexServers = servers;
		teststatus.textContent = '!';
		inusestatus.map(e => e.setAttribute('in-use', false));

		if(!servers)
			return teststatus.title = 'Failed to communicate with Plex', teststatus.classList = false;
		inusestatus.map(e => e.setAttribute('in-use', true));
>>>>>>> Stashed changes

		__save__.disabled = false;
		teststatus.classList = true;

		(servers = [{ sourceTitle: 'GitHub', clientIdentifier: '', name: 'No Plex Server' }, ...servers]).forEach(server => {
			let $option = document.createElement('option'),
				source = server.sourceTitle;

			$option.value = server.clientIdentifier;
			$option.textContent = `${ server.name }${ source ? ` \u2014 ${ source }` : '' }`;
			__servers__.appendChild($option);
		});

		if(ServerID) {
			__servers__.value = ServerID;
		}
	});
}

function getPlexConnections(server) {
	// `server.Connection` can be an array or object.
	let connections = [];

	if(server.Connection instanceof Array)
		connections = server.Connection;
 	else
		connections = [server.Connection];

	return connections.map(connection => ({
		uri: connection.uri,
		local: connection.local === '1'
	}));
}

function getOptionValues() {
	let options = {};

	for(let key in __caught)
		__caught[key] = __caught[key].filter(id => id).slice(0, 100);

	__theme = __theme.filter(v => v);

	$('[data-option="__caught"i]').value = JSON.stringify(__caught);
	$('[data-option="__theme"i]').value = JSON.stringify(__theme);

	__options__.forEach(option => {
		let element = $(
			`[data-option="${ option }"]`
		);

		if(element) {
			if(element.type == 'checkbox')
				options[option] = element.checked || element.getAttribute('save') == "true";
			else
				options[option] = element.value;
		}
	});

	return options;
}

function performOmbiLogin() {
	let l = $('#ombi_url').value,
		a = $('#ombi_api').value,
		s = $('#plex_test_status'),
		e = ($0, $1, $$, $_) => ($1 + (/\\/.test($_)? '\\': '/'));

	l = l
		.replace(/([^\\\/])$/, e)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');
	s.title = '';
	__servers__.innerHTML = '';
	__save__.disabled = true;

	let APIURL = `${ l }api/v1/`,
		headers = { headers: { apikey: a, accept: 'application/json' } };

	fetch(`${ APIURL }Settings/plex`, headers)
		.then( response => response.json() )
		.then( json => {
			/* Get Plex's details first. If it's disabled, or non-existent, then exit */
			/* Swagger API says "enable", but we'll go with "enabled" */
			if(json && (json.enable || json.enabled)) {
				let t = $('#plex_token'),
					u = $('[data-option="UseOmbi"]'),
					s = __servers__;

				json = (json && json.servers.length? json.servers[0]: {});

				let name  = json.name,              // people friendly server name
					token = json.plexAuthToken,     // the auth token
					uuid  = json.machineIdentifier, // the machine ID
					url   = json.ip;                // the Plex URL used

				url = url.replace(/(?:[^\/]+\/\/)?([^\/]+)\/?/, `http${ json.ssl? 's': '' }://$1:${ json.port }/`);

				ClientID = t.value = t.textContent = token;
				ServerID = s.value = uuid;
				s.innerHTML = `<option value="${ uuid }">${ name }</option>`;

				/* Now we can fill in the other details */
				if(u.checked) {
					// Ombi
					let L = $('[data-option="ombiURLRoot"]'),
						A = $('[data-option="ombiToken"]');

					L.value = L.textContent = l;
					A.value = A.textContent = a;

					new Notification('update', 'Filled in Ombi', 3000);

					// CouchPotato
					fetch(`${ APIURL }Settings/CouchPotato`, headers)
						.then( data => data.json() )
						.then( json => {
							if(!json || (!json.enabled && !json.enable)) return;

							let k = $('[data-option="couchpotatoToken"]'),
								K = $('[data-option="couchpotatoURLRoot"]');

							k.value = k.textContent = json.apiKey;
							K.value = K.textContent = json.ip.replace(/(?:[^\/]+\/\/)?([^\/]+)\/?/, `http${ json.ssl? 's': '' }://$1:${ json.port }/`);

							new Notification('update', 'Filled in CouchPotato', 3000);
						} )
						.catch( error => { new Notification('error', 'Error getting CouchPotato details from Ombi'); throw error } );

					// Radarr
					fetch(`${ APIURL }Settings/radarr`, headers)
						.then( data => data.json() )
						.then( json => {
							if(!json || (!json.enabled && !json.enable)) return;

							let k = $('[data-option="radarrToken"]'),
								K = $('[data-option="radarrURLRoot"]'),
								q = $('[data-option="radarrQualityProfileId"]'),
								Q = $('[data-option="radarrStoragePath"]'),
								_q, _Q;

							k.value = k.textContent = json.apiKey;
							K.value = K.textContent = json.ip.replace(/(?:[^\/]+\/\/)?([^\/]+)\/?/, `http${ json.ssl? 's': '' }://$1:${ json.port }/`);
							q.value = _q = json.defaultQualityProfile;
							Q.value = _Q = json.defaultRootPath;

							q.innerHTML = `<option value="${ _q }">[Ombi]: ${ _q }</option>`;
							Q.innerHTML = `<option value="${ _Q }">[Ombi]: ${ _Q }</option>`;

							new Notification('update', 'Filled in Radarr', 3000);
						} )
						.catch( error => { new Notification('error', 'Error getting Radarr details from Ombi'); throw error } );

					// Sonarr
					fetch(`${ APIURL }Settings/sonarr`, headers)
						.then( data => data.json() )
						.then( json => {
							if(!json || (!json.enabled && !json.enable)) return;

							let k = $('[data-option="sonarrToken"]'),
								K = $('[data-option="sonarrURLRoot"]'),
								q = $('[data-option="sonarrQualityProfileId"]'),
								Q = $('[data-option="sonarrStoragePath"]'),
								_q, _Q;

							k.value = k.textContent = json.apiKey;
							K.value = K.textContent = json.ip.replace(/(?:[^\/]+\/\/)?([^\/]+)\/?/, `http${ json.ssl? 's': '' }://$1:${ json.port }/`);
							q.value = _q = json.qualityProfile;
							Q.value = _Q = json.rootPath;

							q.innerHTML = `<option value="${ _q }">[Ombi]: ${ _q }</option>`;
							Q.innerHTML = `<option value="${ _Q }">[Ombi]: ${ _Q }</option>`;

							new Notification('update', 'Filled in Sonarr', 3000);
						} )
						.catch( error => { new Notification('error', 'Error getting Sonarr details from Ombi'); throw error } );
				}

				__save__.disabled = false;
			} else {
				/* Plex either doesn't exist, or is disabled */
				new Notification('error', 'Error getting Plex details from Ombi');
			}
		} )
		.catch( error => { new Notification('error', error); throw error } );
}

function performOmbiTest(refreshing = false) {
	let options = getOptionValues(),
		teststatus = $('#ombi_test_status'),
		path = $('[data-option="ombiURLRoot"]'),
		url,
		headers = { headers: { apikey: options.ombiToken, accept: 'text/html' } },
		enabled = $('#using-ombi');

	teststatus.textContent = '?';
	options.ombiURLRoot = url = path.value = options.ombiURLRoot.replace(/^(\:\d+)/, 'localhost$1').replace(/^(?!^http(s)?:)/, 'http$1://').replace(/\/+$/, '');

	let Get = () => {
		fetch(`${ url }/api/v1/Request/movie`)
			.then(r => r.json())
			.thne(json => {
				json.map(item => {
					__caught.imdb.push(item.imdbId);
					__caught.tmdb.push(item.theMovieDbId);
				});
			});

		fetch(`${ url }/api/v1/Request/tv`)
			.then(r => r.json())
			.thne(json => {
				json.map(item => {
					__caught.imdb.push(item.imdbId);
					__caught.tvdb.push(item.tvDbId);
				});
			});

		fetch(`${ url }/api/v1/Status`, headers)
			.then( response => response.text() )
			.then( status => {
				if (!status || !status.length) throw new Error('Unable to communicate with Ombi');

				if ((status = +status) >= 200 && status < 400) {
					teststatus.textContent = '!';
					enabled.checked = teststatus.classList = true;
					enabled.parentElement.removeAttribute('disabled');
				} else {
					teststatus.textContent = '!';
					enabled.checked = teststatus.classList = false;
					enabled.parentElement.setAttribute('disabled');

					throw new Error(`Ombi error [${ status }]`);
				}
			} )
			.catch( error => { new Notification('error', error) } );
	}

	if(refreshing)
		Get();
	else if(url && url.length)
		requestURLPermissions(url + '/*', allowed =>
			(allowed)?
				Get():
			new Notification('error', 'The user refused permission to access Ombi')
		);
}

function getWatcher(options, api = "getconfig") {
	if(!options.watcherToken)
		return new Notification('error', 'Invalid Watcher token');

	let headers = {
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		'X-Api-Key': options.watcherToken
	};

	if(options.watcherBasicAuthUsername)
		headers.Authorization = `Basic ${ btoa(`${ options.watcherBasicAuthUsername }:${ options.watcherBasicAuthPassword }`) }`;

	return fetch(`${ options.watcherURLRoot }/api/?apikey=${ options.watcherToken }&mode=${ api }&quality=${ options.watcherQualityProfileId || 'Default' }`, { headers })
		.then(response => response.json())
		.catch(error => {
			return new Notification('error', 'Watcher failed to connect with error:' + String(error)),
				[];
		});
}

function performWatcherTest(QualityProfileID = 'Default', refreshing = false) {
	let options = getOptionValues(),
		teststatus = $('#watcher_test_status'),
		path = $('[data-option="watcherURLRoot"]'),
		storagepath = __watcher_storagePath__,
		quality = __watcher_qualityProfile__,
		url,
		enabled = $('#using-watcher');

	quality.innerHTML = '';
	teststatus.textContent = '?';
	storagepath.value = '[Empty]';
	options.watcherURLRoot = url = path.value = options.watcherURLRoot.replace(/^(\:\d+)/, 'localhost$1').replace(/^(?!^http(s)?:)/, 'http$1://').replace(/\/+$/, '');

	let Get = () => {
		getWatcher(options, 'liststatus').then(list => {
			list.map(item => {
				__caught.imdb.push(item.movies.imdbid);
				__caught.tmdb.push(item.movies.tmdbid);
			});
		});

		getWatcher(options, 'getconfig').then(configuration => {
			if(!configuration || !configuration.response) return new Notification('error', 'Failed to get Watcher configuration');

			let names = configuration.config.Quality.Profiles,
				path = configuration.config.Postprocessing.moverpath,
				syntax = path.replace(/\/([\w\s\/\\\{\}]+)$/, '$1'),
				profiles = [];

			path = path.replace(syntax, '');

			for(let name in names)
				profiles.push({
					id: name,
					name
				});

			teststatus.textContent = '!';
			teststatus.classList = enabled.checked = !!profiles.length;

			if(!profiles.length)
				return teststatus.title = 'Failed to communicate with Watcher';
			enabled.parentElement.removeAttribute('disabled');

			let qualities = [];
			profiles.forEach(profile => {
				let option = document.createElement('option');
				let { id, name } = profile;

				option.value = id;
				option.textContent = name;
				qualities.push({ id, name });
				quality.appendChild(option);
			});

			$('[data-option="watcherQualities"i]').value = JSON.stringify(qualities);

			// Because the <select> was reset, the original value is lost.
			if(QualityProfileID)
				quality.value = QualityProfileID;

			storagepath.value = path || '[Default Location]';

			$('[data-option="watcherStoragePaths"i]').value = JSON.stringify(path || { path: '[Default Location]', id: 0 });
		});
	}

	if(refreshing)
		Get();
	else if(url && url.length)
		requestURLPermissions(url + '/*', allowed =>
			(allowed)?
				Get():
			new Notification('error', 'The user refused permission to access Watcher')
		);
}

function getRadarr(options, api = "profile") {
	if(!options.radarrToken)
		return new Notification('error', 'Invalid Radarr token');

	let headers = {
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		'X-Api-Key': options.radarrToken
	};

	if(options.radarrBasicAuthUsername)
		headers.Authorization = `Basic ${ btoa(`${ options.radarrBasicAuthUsername }:${ options.radarrBasicAuthPassword }`) }`;

	return fetch(`${ options.radarrURLRoot }/api/${ api }`, { headers })
		.then(response => response.json())
		.catch(error => {
			return new Notification('error', 'Radarr failed to connect with error:' + String(error)),
				[];
		});
}

function performRadarrTest(QualityProfileID, StoragePath, refreshing = false) {
	let options = getOptionValues(),
		teststatus = $('#radarr_test_status'),
		path = $('[data-option="radarrURLRoot"]'),
		storagepath = __radarr_storagePath__,
		quality = __radarr_qualityProfile__,
		url,
		enabled = $('#using-radarr');

	quality.innerHTML = '';
	teststatus.textContent = '?';
	storagepath.textContent = '';
	options.radarrURLRoot = url = path.value = options.radarrURLRoot.replace(/^(\:\d+)/, 'localhost$1').replace(/^(?!^http(s)?:)/, 'http$1://').replace(/\/+$/, '');

	let Get = () => {
		getRadarr(options, 'movie').then(movies => {
			movies.map(movie => {
				__caught.imdb.push(movie.imdbId);
				__caught.tmdb.push(movie.tmdbId);
			});
		});

		getRadarr(options, 'profile').then(profiles => {
			if(!profiles) return new Notification('error', 'Failed to get Radarr configuration');

			teststatus.textContent = '!';
			teststatus.classList = enabled.checked = !!profiles.length;

			if(!profiles.length)
				return teststatus.title = 'Failed to communicate with Radarr';
			enabled.parentElement.removeAttribute('disabled');

			let qualities = [];
			profiles.forEach(profile => {
				let option = document.createElement('option');
				let { id, name } = profile;

				option.value = id;
				option.textContent = name;
				qualities.push({ id, name });
				quality.appendChild(option);
			});

			$('[data-option="radarrQualities"i]').value = JSON.stringify(qualities);

			// Because the <select> was reset, the original value is lost.
			if(QualityProfileID)
				$('[data-option="__radarrQuality"i]').value = quality.value = QualityProfileID;
		});

		let StoragePaths = [];
		getRadarr(options, 'rootfolder').then(storagepaths => {
			storagepaths.forEach(path => {
				let option = document.createElement('option');

				StoragePaths.push((option.value = option.textContent = path.path).replace(/\\/g, '/'));
				storagepath.appendChild(option);
			});

			$('[data-option="radarrStoragePaths"i]').value = JSON.stringify(storagepaths);

			// Because the <select> was reset, the original value is lost.
			if(StoragePath) {
				storagepath.value = StoragePath;
				$('[data-option="__radarrStoragePath"i]').value = StoragePaths.indexOf(StoragePath.replace(/\\/g, '/')) + 1;
			}
		});
	};

	if(refreshing)
		Get();
	else if(url && url.length)
		requestURLPermissions(url + '/*', allowed =>
			(allowed)?
				Get():
			new Notification('error', 'The user refused permission to access Radarr')
		);
}

function getSonarr(options, api = "profile") {
	if(!options.sonarrToken)
		return new Notification('error', 'Invalid Sonarr token');

	let headers = {
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		'X-Api-Key': options.sonarrToken
	};

	if(options.sonarrBasicAuthUsername)
		headers.Authorization = `Basic ${ btoa(`${ options.sonarrBasicAuthUsername }:${ options.sonarrBasicAuthPassword }`) }`;

	return fetch(`${ options.sonarrURLRoot }/api/${ api }`, { headers })
		.then(response => response.json())
		.catch(error => {
			return new Notification('error', 'Sonarr failed to connect with error:' + String(error)),
				[];
		});
}

function performSonarrTest(QualityProfileID, StoragePath, refreshing = false) {
	let options = getOptionValues(),
		teststatus = $('#sonarr_test_status'),
		path = $('[data-option="sonarrURLRoot"]'),
		storagepath = __sonarr_storagePath__,
		quality = __sonarr_qualityProfile__,
		url,
		enabled = $('#using-sonarr');

	quality.innerHTML = '';
	teststatus.textContent = '?';
	storagepath.textContent = '';
	options.sonarrURLRoot = url = path.value = options.sonarrURLRoot.replace(/^(\:\d+)/, 'localhost$1').replace(/^(?!^http(s)?:)/, 'http$1://').replace(/\/+$/, '');

	let Get = () => {
		getSonarr(options, 'series').then(shows => {
			shows.map(show => {
				__caught.tvdb.push(show.tvdbId);
			});
		});

		getSonarr(options, 'profile').then(profiles => {
			if(!profiles) return new Notification('error', 'Failed to get Sonarr configuration');

			teststatus.textContent = '!';
			teststatus.classList = enabled.checked = !!profiles.length;

			if(!profiles.length)
				return teststatus.title = 'Failed to communicate with Sonarr';
			enabled.parentElement.removeAttribute('disabled');

			let qualities = [];
			profiles.forEach(profile => {
				let option = document.createElement('option');
				let { id, name } = profile;

				option.value = id;
				option.textContent = name;
				qualities.push({ id, name });
				quality.appendChild(option);
			});

			$('[data-option="sonarrQualities"i]').value = JSON.stringify(qualities);

			// Because the <select> was reset, the original value is lost.
			if(QualityProfileID)
				$('[data-option="__sonarrQuality"i]').value = quality.value = QualityProfileID;
		});

		let StoragePaths = [];
		getSonarr(options, 'rootfolder').then(storagepaths => {
			storagepaths.forEach(path => {
				let option = document.createElement('option');

				StoragePaths.push((option.value = option.textContent = path.path).replace(/\\/g, '/'));
				storagepath.appendChild(option);
			});

			$('[data-option="sonarrStoragePaths"i]').value = JSON.stringify(storagepaths);

			// Because the <select> was reset, the original value is lost.
			if(StoragePath) {
				storagepath.value = StoragePath;
				$('[data-option="__sonarrStoragePath"i]').value = StoragePaths.indexOf(StoragePath.replace(/\\/g, '/')) + 1;
			}
		});
	};

	if(refreshing)
		Get();
	else if(url && url.length)
		requestURLPermissions(url + '/*', allowed =>
			(allowed)?
				Get():
			new Notification('error', 'The user refused permission to access Sonarr')
		);
}

function getMedusa(options, api = 'config') {
	if(!options.medusaToken)
		return new Notification('error', 'Invalid Medusa token');

	let headers = {
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		'X-Api-Key': options.medusaToken
	};

	if(options.medusaBasicAuthUsername)
		headers.Authorization = `Basic ${ btoa(`${ options.medusaBasicAuthUsername }:${ options.medusaBasicAuthPassword }`) }`;

	return fetch(`${ options.medusaURLRoot }/api/v2/${ api }`, { headers })
		.then(response => response.json())
		.catch(error => {
			return new Notification('error', 'Medusa failed to connect with error:' + String(error)),
				[];
		});
}

function performMedusaTest(QualityProfileID, StoragePath, refreshing = false) {
	let options = getOptionValues(),
		teststatus = $('#medusa_test_status'),
		path = $('[data-option="medusaURLRoot"]'),
		storagepath = __medusa_storagePath__,
		quality = __medusa_qualityProfile__,
		url,
		enabled = $('#using-medusa');

	quality.innerHTML = '';
	teststatus.textContent = '?';
	storagepath.textContent = '';
	options.medusaURLRoot = url = path.value = options.medusaURLRoot.replace(/^(\:\d+)/, 'localhost$1').replace(/^(?!^http(s)?:)/, 'http$1://').replace(/\/+$/, '');

	let Get = () => {
		getMedusa(options, 'series').then(shows => {
			shows.map(show => {
				__caught.imdb.push(show.id.imdb)
				__caught.tvdb.push(show.id.tvdb);
			});
		});

		getMedusa(options, 'config').then(configuration => {
			if(!configuration) return new Notification('error', 'Failed to get Medusa configuration');

			let { qualities } = configuration.consts,
				profileType = $('[data-option="medusaQualityProfileType"i]').selectedIndex,
				profiles = (profileType == 0? 'presets': profileType == 1? 'values': 'anySets');

			profiles = qualities[profiles];

			teststatus.textContent = '!';
			teststatus.classList = enabled.checked = !!profiles.length;

			if(!profiles.length)
				return teststatus.title = 'Failed to communicate with Medusa';
			enabled.parentElement.removeAttribute('disabled');

			profiles.forEach(profile => {
				let option = document.createElement('option');
				let { value, name } = profile;

				option.value = value;
				option.textContent = name;
				quality.appendChild(option);
			});

			$('[data-option="medusaQualities"i]').value = JSON.stringify(profiles);

			// Because the <select> was reset, the original value is lost.
			if(QualityProfileID)
				$('[data-option="__medusaQuality"i]').value = quality.value = QualityProfileID;
		});

		let StoragePaths = [];
		getMedusa(options, 'config').then(configuration => {
			let storagepaths = configuration.main.rootDirs.filter(d => d.length > 1);

			if(storagepaths.length < 1) return new Notification('error', 'Medusa has no usable storage paths');

			storagepaths.forEach(path => {
				let option = document.createElement('option');

				StoragePaths.push((option.value = option.textContent = path).replace(/\\/g, '/').replace(/\/+$/, ''));
				storagepath.appendChild(option);
			});

			$('[data-option="medusaStoragePaths"i]').value = JSON.stringify(storagepaths.map(path => ({ path, id: path })));

			// Because the <select> was reset, the original value is lost.
			if(StoragePath) {
				$('[data-option="__medusaStoragePath"i]').value = StoragePath;
				storagepath.selectedIndex = StoragePaths.indexOf(StoragePath.replace(/\\/g, '/').replace(/\/+$/, ''));
			}
		});
	};

	if(refreshing)
		Get();
	else if(url && url.length)
		requestURLPermissions(url + '/*', allowed =>
			(allowed)?
				Get():
			new Notification('error', 'The user refused permission to access Medusa')
		);
}

function getSickBeard(options, api = 'sb') {
	if(!options.sickBeardToken)
		return new Notification('error', 'Invalid Sick Beard token');

	let headers = {
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		'X-Api-Key': options.sickBeardToken, // not really used, but just in case...
	};

	if(options.sickBeardBasicAuthUsername)
		headers.Authorization = `Basic ${ btoa(`${ options.sickBeardBasicAuthUsername }:${ options.sickBeardBasicAuthPassword }`) }`;

	return fetch(`${ options.sickBeardURLRoot }/api/${ options.sickBeardToken }/?cmd=${ api }`, { headers })
		.then(response => response.json())
		.catch(error => {
			return new Notification('error', 'Sick Beard failed to connect with error:' + String(error)),
				[];
		});
}

function performSickBeardTest(QualityProfileID, StoragePath, refreshing = false) {
	let options = getOptionValues(),
		teststatus = $('#sickBeard_test_status'),
		path = $('[data-option="sickBeardURLRoot"]'),
		storagepath = __sickBeard_storagePath__,
		quality = __sickBeard_qualityProfile__,
		url,
		enabled = $('#using-sickBeard');

	quality.innerHTML = '';
	teststatus.textContent = '?';
	storagepath.textContent = '';
	options.sickBeardURLRoot = url = path.value = options.sickBeardURLRoot.replace(/^(\:\d+)/, 'localhost$1').replace(/^(?!^http(s)?:)/, 'http$1://').replace(/\/+$/, '');

	let Get = () => {
		getSickBeard(options, 'shows').then(shows => {
			let _shows = shows.data;

			shows = [];

			for(let _show in _shows)
				shows.push(_shows[_show]);

			shows.map(show => {
				__caught.tvdb.push(show.tvdbid);
			});
		});

		getSickBeard(options, 'sb.getdefaults').then(configuration => {
			if(!configuration) return new Notification('error', 'Failed to get Sick Beard configuration');

			let qualities = configuration.data,
				profileType = $('[data-option="sickBeardQualityProfileType"i]').selectedIndex,
				profiles = (profileType == 0? 'initial': 'archive');

			profiles = qualities[profiles];

			teststatus.textContent = '!';
			teststatus.classList = enabled.checked = !!profiles.length;

			if(!profiles.length)
				return teststatus.title = 'Failed to communicate with Sick Beard';
			enabled.parentElement.removeAttribute('disabled');

			profiles = profiles.map((profile, index, array) => {
				let option = document.createElement('option');
				let name = profile;

				option.value = option.textContent = name;
				quality.appendChild(option);

				return { id: name, name };
			});

			$('[data-option="sickBeardQualities"i]').value = JSON.stringify(profiles);

			// Because the <select> was reset, the original value is lost.
			if(QualityProfileID)
				$('[data-option="__sickBeardQuality"i]').value = quality.value = QualityProfileID;
		});

		let StoragePaths = [];
		getSickBeard(options, 'sb.getrootdirs').then(configuration => {
			let storagepaths = configuration.data.filter(d => +d.valid > 0);

			if(storagepaths.length < 1) return new Notification('error', 'Sick Beard has no usable storage paths');

			storagepaths = storagepaths.map(path => {
				let option = document.createElement('option');

				StoragePaths.push((path = option.value = option.textContent = path.location).replace(/\\/g, '/').replace(/\/+$/, ''));
				storagepath.appendChild(option);

				return path;
			});

			$('[data-option="sickBeardStoragePaths"i]').value = JSON.stringify(storagepaths.map((path, index, array) => ({ path, id: index })));

			// Because the <select> was reset, the original value is lost.
			if(StoragePath) {
				$('[data-option="__sickBeardStoragePath"i]').value =
				storagepath.selectedIndex = StoragePaths.indexOf(StoragePath.replace(/\\/g, '/').replace(/\/+$/, ''));
			}
		});
	};

	if(refreshing)
		Get();
	else if(url && url.length)
		requestURLPermissions(url + '/*', allowed =>
			(allowed)?
				Get():
			new Notification('error', 'The user refused permission to access Sick Beard')
		);
}

function enableCouchPotato() {
	$('#use-couchpotato').parentElement.removeAttribute('disabled');
}

function HandleProxySettings(data) {
	return {
		enabled: data.UseProxy,
		url: data.ProxyURL,
		headers: data.ProxyHeaders,
	};
}

function saveOptions() {
	ServerID = [...__servers__.selectedOptions][0];

	if(!ServerID || !ServerID.value) {
		let withoutplex = confirm('Continue without a Plex server?');

		if(withoutplex)
			return saveOptionsWithoutPlex();
		else
			return new Notification('error', 'Select a server!');
	}
	ServerID = ServerID.value;

	let server = PlexServers.find(ID => ID.clientIdentifier === ServerID);

	// This should never happen, but can be useful for debugging.
	if(!server)
		return new Notification('error', `Could not find Plex server ${ ServerID }`),
			null;

	terminal.log('Selected server information:', server);

	// Important detail: we get the token from the selected server, NOT the token the user has entered before.
	let serverToken = server.accessToken,
		serverConnections = getPlexConnections(server);
	ClientID = server.clientIdentifier;

	if(!serverConnections.length)
		return new Notification('error', 'Could not locate Plex server URL'),
			null;
	terminal.log('Plex Server connections:', serverConnections);

	// With a "user token" you can access multiple servers. A "normal" token is just for one server.
	let options = getOptionValues(),
		endingSlash = ($0, $1, $$, $_) => ($1 + (/\\/.test($_)? '\\': '/'));

	options.IGNORE_PLEX = false;

	let r, R = 'Radarr',
		s, S = 'Sonarr',
		w, W = 'Watcher',
		c, C = 'CouchPotato',
		o, O = 'Ombi',
		m, M = 'Medusa',
		i, I = 'Sick Beard';

	let who = () => (r? R: s? S: w? W: c? C: o? O: m? M: i? I: 'manager');

	// Instead of having the user be so wordy, complete the URL ourselves here
	if((r = !options.radarrURLRoot && options.radarrToken) || (s = !options.sonarrURLRoot && options.sonarrToken) || (w = !options.watcherURLRoot && options.watcherToken) || (o = !options.ombiURLRoot && options.ombiToken) || (m = !options.medusaURLRoot && options.medusaToken) || (i = !options.sickBeardURLRoot && options.sickBeardToken)) {
		return new Notification('error', `Please enter a valid URL for ${ who() }`),
			null;
	} if((options.radarrURLRoot && !options.radarrStoragePath) && (options.sonarrURLRoot && !options.sonarrStoragePath) && (options.medusaURLRoot && !options.medusaStoragePath) && (options.sickBeardURLRoot && !options.sickBeardStoragePath)) {
		return new Notification('error', `Please enter a valid storage path for ${ who() }`),
			null;
	} if(options.watcherURLRoot && !options.watcherQualityProfileId) {
		return new Notification('error', 'Select a quality profile for Watcher'),
			null;
	} if(options.radarrURLRoot && !options.radarrQualityProfileId) {
		return new Notification('error', 'Select a quality profile for Radarr'),
			null;
	} if(options.sonarrURLRoot && !options.sonarrQualityProfileId) {
		return new Notification('error', 'Select a quality profile for Sonarr'),
			null;
	} if(options.medusaURLRoot && !options.medusaQualityProfileId) {
		return new Notification('error', 'Select a quality profile for Medusa'),
			null;
	} if(options.sickBeardURLRoot && !options.sickBeardQualityProfileId) {
		return new Notification('error', 'Select a quality profile for Sick Beard'),
			null;
	} if(!ClientID) {
		ClientID = window.crypto.getRandomValues(new Uint32Array(5))
			.join('-');
	}
	storage.set({ ClientID });

	options.plexURL = options.plexURLRoot = (options.plexURL || "https://app.plex.tv/")
		.replace(/^(\:\d+)/, 'localhost$1')
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.ombiURLRoot = (options.ombiURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.medusaURLRoot = (options.medusaURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.watcherURLRoot = (options.watcherURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.radarrURLRoot = (options.radarrURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.sonarrURLRoot = (options.sonarrURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.sickBeardURLRoot = (options.sickBeardURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.radarrStoragePath = options.radarrStoragePath
		.replace(/([^\\\/])$/, endingSlash);

	options.sonarrStoragePath = options.sonarrStoragePath
		.replace(/([^\\\/])$/, endingSlash);

	options.medusaStoragePath = options.medusaStoragePath
		.replace(/([^\\\/])$/, endingSlash);

	options.sickBeardStoragePath = options.sickBeardStoragePath
		.replace(/([^\\\/])$/, endingSlash);

	// icons for the popup page
	for(let index = 0, array = 'plex ombi medusa watcher radarr sonarr couchpotato sickBeard'.split(' '), item = save('URLs', array); index < array.length; index++)
		save(`${ item = array[index] }.url`, options[`${ item }URLRoot`]);

	// Dynamically asking permissions
	requestURLPermissions(options.couchpotatoURLRoot);
	requestURLPermissions(options.watcherURLRoot);
	requestURLPermissions(options.radarrURLRoot);
	requestURLPermissions(options.sonarrURLRoot);
	requestURLPermissions(options.medusaURLRoot);
	requestURLPermissions(options.ombiURLRoot);
	requestURLPermissions(options.sickBeardURLRoot);

	// Handle the proxy settings
	options.proxy = HandleProxySettings(options);

	function OptionsSavedMessage() {
		// Update status to let the user know the options were saved
		new Notification('update', 'Saved', 1500);
	}
	new Notification('update', 'Saving...', 1500);

	let data = {
		...options,
		servers: [
			{
				id: ClientID,
				token: serverToken,
				connections: serverConnections
			},
		]
	};

	storage.set(data, () => {
		if(chrome.runtime.lastError) {
			new Notification('error', 'Error with saving: ' + chrome.runtime.lastError.message);
			storage.set(data, OptionsSavedMessage);
		} else {
			terminal.log('Saved Options: ', options);
			OptionsSavedMessage();
		}
	});
}

function saveOptionsWithoutPlex() {
	// See #4
	let options = getOptionValues(),
		endingSlash = ($0, $1, $$, $_) => ($1 + (/\\/.test($_)? '\\': '/'));

	options.IGNORE_PLEX = true;

	let r, R = 'Radarr',
		s, S = 'Sonarr',
		w, W = 'Watcher',
		c, C = 'CouchPotato',
		o, O = 'Ombi',
		m, M = 'Medusa',
		i, I = 'Sick Beard';

	let who = () => (r? R: s? S: w? W: c? C: o? O: m? M: 'manager');

	// Instead of having the user be so wordy, complete the URL ourselves here
	if((r = !options.radarrURLRoot && options.radarrToken) || (s = !options.sonarrURLRoot && options.sonarrToken) || (w = !options.watcherURLRoot && options.watcherToken) || (o = !options.ombiURLRoot && options.ombiToken) || (m = !options.medusaURLRoot && options.medusaToken) || (i = !options.sickBeardURLRoot && options.sickBeardToken)) {
		return new Notification('error', `Please enter a valid URL for ${ who() }`),
			null;
	} if((options.radarrURLRoot && !options.radarrStoragePath) && (options.sonarrURLRoot && !options.sonarrStoragePath) && (options.medusaURLRoot && !options.medusaStoragePath) && (options.sickBeardURLRoot && !options.sickBeardStoragePath)) {
		return new Notification('error', `Please enter a valid storage path for ${ who() }`),
			null;
	} if(options.watcherURLRoot && !options.watcherQualityProfileId) {
		return new Notification('error', 'Select a quality profile for Watcher'),
			null;
	} if(options.radarrURLRoot && !options.radarrQualityProfileId) {
		return new Notification('error', 'Select a quality profile for Radarr'),
			null;
	} if(options.sonarrURLRoot && !options.sonarrQualityProfileId) {
		return new Notification('error', 'Select a quality profile for Sonarr'),
			null;
	} if(options.medusaURLRoot && !options.medusaQualityProfileId) {
		return new Notification('error', 'Select a quality profile for Medusa'),
			null;
	} if(options.sickBeardURLRoot && !options.sickBeardQualityProfileId) {
		return new Notification('error', 'Select a quality profile for Sick Beard'),
			null;
	} if(!ClientID) {
		ClientID = 'web-to-plex:client';
		storage.set({ ClientID });
	}

	// Still need to set this
	options.plexURL = options.plexURLRoot = "https://ephellon.github.io/web.to.plex/no.server/";

	options.ombiURLRoot = (options.ombiURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.medusaURLRoot = (options.medusaURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.watcherURLRoot = (options.watcherURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.radarrURLRoot = (options.radarrURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.sonarrURLRoot = (options.sonarrURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.sickBeardURLRoot = (options.sickBeardURLRoot || "")
		.replace(/([^\\\/])$/, endingSlash)
		.replace(/^(?!^http(s)?:\/\/)(.+)/, 'http$1://$2');

	options.radarrStoragePath = options.radarrStoragePath
		.replace(/([^\\\/])$/, endingSlash);

	options.sonarrStoragePath = options.sonarrStoragePath
		.replace(/([^\\\/])$/, endingSlash);

	options.medusaStoragePath = options.medusaStoragePath
		.replace(/([^\\\/])$/, endingSlash);

	options.sickBeardStoragePath = options.sickBeardStoragePath
		.replace(/([^\\\/])$/, endingSlash);

	// icons for the popup page
	for(let index = 0, array = 'ombi medusa watcher radarr sonarr couchpotato sickBeard'.split(' '), item = save('URLs', array); index < array.length; index++)
		save(`${ item = array[index] }.url`, options[`${ item }URLRoot`]);

	// Dynamically asking permissions
	requestURLPermissions(options.couchpotatoURLRoot);
	requestURLPermissions(options.watcherURLRoot);
	requestURLPermissions(options.radarrURLRoot);
	requestURLPermissions(options.sonarrURLRoot);
	requestURLPermissions(options.medusaURLRoot);
	requestURLPermissions(options.ombiURLRoot);

	// Handle the proxy settings
	options.proxy = HandleProxySettings(options);

	function OptionsSavedMessage() {
		// Update status to let the user know the options were saved
		new Notification('update', 'Saved', 1500);
	}
	new Notification('update', 'Saving...', 1500);

	let data = options;

	storage.set(data, () => {
		if(chrome.runtime.lastError) {
			new Notification('error', 'Error with saving: ' + chrome.runtime.lastError.message);
			storage.set(data, OptionsSavedMessage);
		} else {
			terminal.log('Saved Options: ', options);
			OptionsSavedMessage();
		}
	});
}

function requestURLPermissions(url, callback) {
	if(url && callback)
		return callback(true);
	else if(url)
		return true;
	else
		return false;

	/* DEAD CODE - DEAD CODE - DEAD CODE - DEAD CODE - DEAD CODE */
	/* DEAD CODE - DEAD CODE - DEAD CODE - DEAD CODE - DEAD CODE */
	/* DEAD CODE - DEAD CODE - BANANA 🍌 - DEAD CODE - DEAD CODE */
	/* DEAD CODE - DEAD CODE - DEAD CODE - DEAD CODE - DEAD CODE */
	/* DEAD CODE - DEAD CODE - DEAD CODE - DEAD CODE - DEAD CODE */

	/* Obsolete, but may be useful later? */
	if(!url || /^https?\:\/\/\*/i.test(url))
		return;

	// TODO: Firefox doesn't have support for the chrome.permissions API.
	if(chrome.permissions) {
		// When asking permissions the URL needs to have a trailing slash.
		chrome.permissions.request({ origins: [`${ url }`] }, callback);
	}
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.*
function restoreOptions(OPTIONS) {
	function setOptions(items) {
		if(!items) return;

		__options__.forEach(option => {
			let el = $(`[data-option="${ option }"]`);

			if(!el) return;

			if(el.type == 'checkbox')
				el.setAttribute('checked', el.checked = (typeof items[option] == 'boolean'? items[option]: el.getAttribute('checked') == 'true'));
			else
				el.value = items[option] || '';

			if(el.value !== '' && !el.disabled) {
				if(el.type == 'checkbox')
					el.setAttribute('save', el.checked == 'true');
				else if(el.type == 'range')
					el.setAttribute('save', el.value),
					el.oninput({ target: el });
				else if(/password$/i.test(option))
					el.setAttribute('type', el.type = 'password');
				else
					el.placeholder = `Last save: ${ el.value }`,
					el.title = `Double-click to restore value ("${ el.value }")`,
					el.setAttribute('save', el.value),
					el.ondblclick = event => el.value = el.getAttribute('save');
			}
		});

		if(items.plexToken)
			performPlexTest(items.servers? items.servers[0].id: null);
		if(items.watcherURLRoot)
			performWatcherTest(items.watcherQualityProfileId, true);
		if(items.ombiURLRoot)
			performOmbiTest(true);
		if(items.medusaURLRoot)
			performMedusaTest(items.medusaQualityProfileId, items.medusaStoragePath, true);
		if(items.radarrURLRoot)
			performRadarrTest(items.radarrQualityProfileId, items.radarrStoragePath, true);
		if(items.sonarrURLRoot)
			performSonarrTest(items.sonarrQualityProfileId, items.sonarrStoragePath, true);
		if(items.sickBeardURLRoot)
			performSickBeardTest(items.sickBeardQualityProfileId, items.sickBeardStoragePath, true);
		if(items.couchpotatoURLRoot)
			enableCouchPotato();

		let __domains = (sites => {
			let array = [];

			for(let site in sites)
				array.push(site);

			return array;
		})({ ...builtin_sites, ...plugin_sites });

		$('[data-option="__domains"i]').value = __domains;
	}

	if (OPTIONS && typeof OPTIONS == 'string') {
		OPTIONS = JSON.parse(OPTIONS);

		setOptions(OPTIONS);
	} else {
		storage.get(null, items => {
			// Sigh... This is a workaround for Firefox; newer versions have support for the `chrome.storage.sync` API,
			// BUT, it will throw an error if you haven't enabled it...
			if(chrome.runtime.lastError)
				storage.get(null, setOptions);
			else
				setOptions(items);
		});
	}

	setTimeout(() => {
		$('.checkbox:not([disabled]) input', true)
			.forEach((element, index, array) => {
				let options = getOptionValues(),
					using   = element.getAttribute('checked');

				element.checked = using === 'true';
			})
	}, 250);
}

// Helpers
document.furnish = function furnish(name, attributes = {}, ...children) {
	let u = v => v && v.length, R = RegExp;

	if( !u(name) )
		throw TypeError(`TAGNAME cannot be ${ (name === '')? 'empty': name }`);

	let options = attributes.is === true? { is: true }: null;

	delete attributes.is;

	name = name.split(/([#\.][^#\.\[\]]+)/).filter( u );

	if(name.length <= 1)
		name = name[0].split(/^([^\[\]]+)(\[.+\])/).filter( u );

	if(name.length > 1)
		for(let n = name, i = 1, l = n.length, t, v; i < l; i++)
			if((v = n[i].slice(1, n[i].length)) && (t = n[i][0]) == '#')
				attributes.id = v;
			else if(t == '.')
				attributes.classList = [].slice.call(attributes.classList || []).concat(v);
			else if(/\[(.+)\]/.test(n[i]))
				R.$1.split('][').forEach(N => attributes[(N = N.split('=', 2))[0]] = N[1] || '');
	name = name[0];

	let element = document.createElement(name, options);

	if(attributes.classList instanceof Array)
		attributes.classList = attributes.classList.join(' ');

	Object.entries(attributes).forEach(
		([name, value]) => (/^(on|(?:inner|outer)(?:HTML|Text)|textContent|class(?:List|Name)$|value)/.test(name))?
			element[name] = value:
			element.setAttribute(name, value)
	);

	children
		.filter( child => child !== undefined && child !== null )
		.forEach(
			child =>
				child instanceof Element?
					element.append(child):
				child instanceof Node?
					element.appendChild(child):
				element.appendChild(document.createTextNode(child))
		);

	return element;
};

// Default sites and their links
let builtins = {
	"Netflix": "https://netflix.com/",
	"Verizon": "https://tv.verizon.com/",
	"Trakt": "https://trakt.tv/",
	"Shana Project": "https://shanaproject.com/",
	"YouTube": "https://youtube.com/",
	"Rotten Tomatoes": "https://rottentomatoes.com/",
	"Fandango": "https://www.fandango.com/",
	"Amazon": "https://www.amazon.com/Amazon-Video/s/browse/ref=web_to_plex?node=2858778011",
	"IMDb": "https://imdb.com/",
	"Couch Potato": "http://couchpotato.life/",
	"VRV": "https://vrv.co/",
	"TMDb": "https://themoviedb.org/",
	"Letterboxd": "https://letterboxd.com/",
	"Hulu": "https://hulu.com/",
	"Flickmetrix": "https://flickmetrix.com/",
	"TVDb": "https://thetvdb.com/",
	"Metacritic": "https://www.metacritic.com/",
	"ShowRSS": "https://showrss.info/",
	"Vudu": "https://vudu.com/",
	"Movieo": "https://movieo.me/",
	"Vumoo": "https://vumoo.to/",
	"TV Maze": "https://tvmaze.com/",
	"Google Play": "https://play.google.com/store/movies",
	"Google": "https://google.com/",
	"iTunes": "https://itunes.apple.com/",
	"JustWatch": "https://justwatch.com/",
	"MovieMeter": "https://moviemeter.nl/",
	"GoStream": "https://gostream.site/",
	"Tubi": "https://tubitv.com/",
	"Web to Plex": "https://ephellon.github.io/web.to.plex/",
	"Allocine": "https://allocine.fr/",
	"Plex": "https://app.plex.tv/",

	// Dont' forget to add to the __options__ array!
}, builtin_array = [], builtin_sites = {}, builtinElement = $('#builtin');

for(let builtin in builtins)
	builtin_array.push(builtin);
builtin_array = builtin_array.sort((a,b) => { let [x, y] = [a, b].map(v => v.toLowerCase()); return x < y? -1: 1; });

for(let index = 0, length = builtin_array.length; builtinElement && index < length; index++) {
	let builtin = builtins[builtin_array[index]];

	if(builtin instanceof Array) {
		for(let i = 0, l = builtin.length; i < l; i++) {
			let title = builtin_array[index],
				name  = 'builtin_' + title.toLowerCase().replace(/\s+/g, ''),
				url   = new URL(builtin[i]),
				js    = name.replace(/^builtin_/i, ''),
				o     = url.origin,
				r     = url.host.replace(/^(ww\w+\.)/, '');

			builtin_sites[r] = o;

			if(!i)
				builtinElement.innerHTML +=
`
<h3>${ title }</h3>
<div class="checkbox">
	<input id="${ name }" type="checkbox" data-option="${ name }" pid="${ r }" js="${ js }">
	<label for="${ name }"></label>
</div>
<div>
	Run on <a href="${ url.href }" title="${ r }" target="_blank">${ title }</a>
</div>

<hr>
`;
		}
	} else {
		let title = builtin_array[index],
			name  = 'builtin_' + title.toLowerCase().replace(/\s+/g, ''),
			url   = new URL(builtins[title]),
			js    = name.replace(/^builtin_/i, ''),
			o     = url.origin,
			r     = url.host.replace(/^(ww\w+\.)/, '');

		builtin_sites[r] = o;

		builtinElement.innerHTML +=
`
<h3>${ title }</h3>
<div class="checkbox">
	<input id="${ name }" type="checkbox" data-option="${ name }" bid="${ r }" js="${ js }">
	<label for="${ name }"></label>
</div>
<div>
	Run on <a href="${ url.href }" title="${ r }" target="_blank">${ title }</a>
</div>

<hr>
`;
	}

	// save(`permission:${ r }`, true);
	// save(`script:${ r }`, js);
	// save(`builtin:${ r }`, true);
}

save('builtin.sites', builtin_sites);

$('[id^="builtin_"]', true)
	.forEach(element => element.addEventListener('click', event => {
		let self = event.target,
			bid = self.getAttribute('bid'),
			js = self.getAttribute('js');

		if(self.checked) {
			terminal.log(bid, builtin_sites[bid]);
			requestURLPermissions(builtin_sites[bid].replace(/https?:\/\/(ww\w+\.)?/i, '*://*.').replace(/\/?$/, '/*'), granted => {
				save(`permission:${ bid }`, granted);
				save(`script:${ bid }`, granted? js: null);
			});
		} else {
			save(`permission:${ bid }`, false);
			save(`script:${ bid }`, null);
		}

		save(`builtin:${ bid }`, true);
	})
);

// Plugins and their links
let plugins = {
	'Indomovie': ['https://indomovietv.club/', 'https://indomovietv.org/', 'https://indomovietv.net/'],
	'Toloka': 'https://toloka.to/',
	'Shana Project': 'https://www.shanaproject.com/',
	'My Anime List': 'https://myanimelist.net/',
	'My Shows': 'https://myshows.me/',
	'Redbox': 'https://www.redbox.com/',
	'Kitsu': 'https://kitsu.io/',
	'Go': 'https://freeform.go.com/',
	'SnagFilms': 'http://snagfilms.com/',
	'Free Movies Cinema': 'https://freemoviescinema.com/',

	// Don't forget to add to the __options__ array!
}, plugin_array = [], plugin_sites = {}, pluginElement = $('#plugins');

for(let plugin in plugins)
	plugin_array.push(plugin);
plugin_array = plugin_array.sort((a,b) => { let [x, y] = [a, b].map(v => v.toLowerCase()); return x < y? -1: 1; });

for(let index = 0, length = plugin_array.length; pluginElement && index < length; index++) {
	let plugin = plugins[plugin_array[index]];

	if(plugin instanceof Array) {
		for(let i = 0, l = plugin.length; i < l; i++) {
			let title = plugin_array[index],
				name  = 'plugin_' + title.toLowerCase().replace(/\s+/g, ''),
				url   = new URL(plugin[i]),
				js    = name.replace(/^plugin_/i, ''),
				o     = url.origin,
				r     = url.host.replace(/^(ww\w+\.)/, '');

			plugin_sites[r] = o;

			if(!i)
				pluginElement.innerHTML +=
`
<h3>${ title }</h3>
<div class="checkbox">
	<input id="${ name }" type="checkbox" data-option="${ name }" pid="${ r }" js="${ js }">
	<label for="${ name }"></label>
</div>
<div>
	Run on <a href="${ url.href }" title="${ r }" target="_blank">${ title }</a>
</div>

<hr>
`;
		}
	} else {
		let title = plugin_array[index],
			name  = 'plugin_' + title.toLowerCase().replace(/\s+/g, ''),
			url   = new URL(plugins[title]),
			js    = name.replace(/^plugin_/i, ''),
			o     = url.origin,
			r     = url.host.replace(/^(ww\w+\.)/, '');

		plugin_sites[r] = o;

		pluginElement.innerHTML +=
`
<h3>${ title }</h3>
<div class="checkbox">
	<input id="${ name }" type="checkbox" data-option="${ name }" pid="${ r }" js="${ js }">
	<label for="${ name }"></label>
</div>
<div>
	Run on <a href="${ url.href }" title="${ r }" target="_blank">${ title }</a>
</div>

<hr>
`;
	}
}

save('optional.sites', plugin_sites);

$('[id^="plugin_"]', true)
	.forEach(element => element.addEventListener('click', event => {
		let self = event.target,
			pid = self.getAttribute('pid'),
			js = self.getAttribute('js');

		if(self.checked) {
			terminal.log(pid, plugin_sites[pid]);
			requestURLPermissions(plugin_sites[pid].replace(/https?:\/\/(ww\w+\.)?/i, '*://*.').replace(/\/?$/, '/*'), granted => {
				save(`permission:${ pid }`, granted);
				save(`script:${ pid }`, granted? js: null);
			});
		} else {
			save(`permission:${ pid }`, false);
			save(`script:${ pid }`, null);
		}

		save(`builtin:${ pid }`, false);
	})
);

let empty = () => {};

document.addEventListener('DOMContentLoaded', restoreOptions);
__save__.addEventListener('click', saveOptions);

$('#plex_test')
	.addEventListener('click', event => {
		let pt = $('#plex_token').value,
			pu = $('#plex_username').value,
			pp = $('#plex_password').value,
			ou = $('#ombi_url').value,
			oa = $('#ombi_api').value;

		if(pt)
			performPlexTest(ServerID);
		else if(pu && pp)
			performPlexLogin();
		else if(ou && oa)
			performOmbiLogin();
	});
$('#watcher_test', true).forEach(element => element.addEventListener('click', event => performWatcherTest()));
$('#radarr_test', true).forEach(element => element.addEventListener('click', event => performRadarrTest()));
$('#sonarr_test', true).forEach(element => element.addEventListener('click', event => performSonarrTest()));
$('#medusa_test', true).forEach(element => element.addEventListener('click', event => performMedusaTest()));
$('#ombi_test', true).forEach(element => element.addEventListener('click', event => performOmbiTest()));
$('#sickBeard_test', true).forEach(element => element.addEventListener('click', event => performSickBeardTest()));
$('#enable-couchpotato', true).forEach(element => element.addEventListener('click', event => enableCouchPotato()));

/* INPUT | Get the JSON data */
$('#json_get').addEventListener('click', event => {
	let data_container = $('#json_data'),
		data = atob((data_container.value || data_container.textContent).replace(/\s*\[.+\]\s*/, ''));

	if(!data) return new Notification('warning', 'The data cannot be blank, null, or undefined');

	try {
		restoreOptions(data);

		new Notification('update', 'Restored configuration data', 3000);
	} catch(error) {
		new Notification('error', `Error restoring configuration data: ${ error }`);
	}
});

/* OUTPUT | Set the JSON data */
$('#json_set').addEventListener('click', event => {
	let data_container = $('#json_data'),
		data = getOptionValues();

	data_container.value = data_container.textContent = `[${ (new Date).toString().slice(0, 24) }]${ btoa(JSON.stringify(data)) }`;

	new Notification('info', 'Copy the configuration data somewhere safe, use it to restore your options');
});

/* Erase Cached Searches */
$('#erase_cache').addEventListener('click', event => {
	let options = JSON.stringify(getOptionValues());

	new Notification('info', 'Clearing...', 3000);
	storage.get(null, items => {
		for(let item in items)
			if(/^~\/cache\//i.test(item))
				storage.remove(item);
	});

	saveOptions(event);
});

$('#version')
	.innerHTML = `Version ${ manifest.version }`;

$('[type="range"]', true)
	.forEach((element, index, array) => {
		let sibling = element.nextElementSibling,
			symbol = element.getAttribute('symbol') || '';

		sibling.value = element.value + symbol;

		element.oninput = (event, self) => (self = event.target).nextElementSibling.value = self.value + (self.getAttribute('symbol') || '');
	});

$('.checkbox', true)
	.forEach((element, index, array) => {
		element.addEventListener('click', event => {
			let self = event.target;

			while(!~[...self.classList].indexOf('checkbox') && self.parentElement && self.parentElement != self)
				self = self.parentElement;

			if('disabled' in self.attributes)
				return event.preventDefault(true);
			/* Stop the event from further processing */
		});
	});

$('.test', true)
	.forEach((element, index, array) => {
		element.addEventListener('click', async event => {
			event.preventDefault(true);

			let self = event.target;

			await saveOptions(event);

			open(self.href, self.target);
		});
	});

$('[id^="theme:"i]', true)
	.forEach((element, index, array) => {
		element.addEventListener('click', async event => {
			let self = event.target,
				R = RegExp;

			let [a, b] = self.getAttribute('theme').split(/\s*:\s*/).filter(v => v),
				value = `${self.id.replace(/^theme:/i, '')}-${b}`;

			if(/^(checkbox)$/i.test(self.type) && (self.checked + '') == a)
				__theme.push(value);
			else if(/^(text|input|button|\B)$/i.test(self.type) && R(self.value + '', 'i').test(a))
				__theme.push(value);
			else
				__theme = __theme.filter(v => v != value);
		});
	});

// CORS exception: SecurityError
// MUST be { window }, never { top }
let { hash } = window.location;

if(hash.length > 1)
	switch(hash = hash.slice(1, hash.length).toLowerCase()) {
		case 'save':
			setTimeout(async() => {
				await saveOptions();

				window.postMessage({ type: 'INITIALIZE' });
			}, 1000);
			break;

		default:
			terminal.log(`Unknown event "${ hash }"`);
			break;
	};

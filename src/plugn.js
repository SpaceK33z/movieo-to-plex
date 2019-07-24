/* plugn.js (Plugin) - Web to Plex */
/* global chrome */

let PLUGN_DEVELOPER = false;

let PLUGN_TERMINAL =
    PLUGN_DEVELOPER?
        console:
    { error: m => m, info: m => m, log: m => m, warn: m => m, group: m => m, groupEnd: m => m };

let LAST, LAST_JS, LAST_INSTANCE, LAST_ID, LAST_TYPE, FOUND = {};

let PLUGN_STORAGE = chrome.storage.sync || chrome.storage.local;
let PLUGN_CONFIGURATION;

function load(name) {
    return JSON.parse(localStorage.getItem(btoa(name)));
}

function save(name, data) {
    return localStorage.setItem(btoa(name), JSON.stringify(data));
}

async function Load(name = '') {
    if(!name)
        return /* invalid name */;

    name = 'Cache-Data/' + btoa(name.toLowerCase().replace(/\s+/g, ''));

    return new Promise((resolve, reject) => {
        function LOAD(DISK) {
            let data = JSON.parse(DISK[name] || null);

            return resolve(data);
        }

        PLUGN_STORAGE.get(null, DISK => {
            if(chrome.runtime.lastError)
                chrome.storage.local.get(null, LOAD);
            else
                LOAD(DISK);
        });
    });
}

async function Save(name = '', data) {
    if(!name)
        return /* invalid name */;

    name = 'Cache-Data/' + btoa(name.toLowerCase().replace(/\s+/g, ''));
    data = JSON.stringify(data);

    await PLUGN_STORAGE.set({[name]: data}, () => data);

    return name;
}

function GetConsent(name, builtin) {
    return PLUGN_CONFIGURATION[`${ (builtin? 'builtin': 'plugin') }_${ name }`];
}

// get the saved options
function getConfiguration() {
    return new Promise((resolve, reject) => {
        function handleConfiguration(options) {
            if((!options.plexToken || !options.servers) && !options.DO_NOT_USE)
                return reject(new Error('Required options are missing')),
                    null;

            let server, o;

            if(!options.DO_NOT_USE) {
                // For now we support only one Plex server, but the options already
                // allow multiple for easy migration in the future.
                server = options.servers[0];
                o = {
                    server: {
                        ...server,
                        // Compatibility for users who have not updated their settings yet.
                        connections: server.connections || [{ uri: server.url }]
                    },
                    ...options
                };

                options.plexURL = o.plexURL?
                    `${ o.plexURL }web#!/server/${ o.server.id }/`:
                `https://app.plex.tv/web/app#!/server/${ o.server.id }/`;
            } else {
                o = options;
            }

            if(o.couchpotatoBasicAuthUsername)
                o.couchpotatoBasicAuth = {
                    username: o.couchpotatoBasicAuthUsername,
                    password: o.couchpotatoBasicAuthPassword
                };

            // TODO: stupid copy/pasta
            if(o.watcherBasicAuthUsername)
                o.watcherBasicAuth = {
                    username: o.watcherBasicAuthUsername,
                    password: o.watcherBasicAuthPassword
                };

            if(o.radarrBasicAuthUsername)
                o.radarrBasicAuth = {
                    username: o.radarrBasicAuthUsername,
                    password: o.radarrBasicAuthPassword
                };

            if(o.sonarrBasicAuthUsername)
                o.sonarrBasicAuth = {
                    username: o.sonarrBasicAuthUsername,
                    password: o.sonarrBasicAuthPassword
                };

            if(o.usingOmbi && o.ombiURLRoot && o.ombiToken) {
                o.ombiURL = o.ombiURLRoot;
            } else {
                delete o.ombiURL; // prevent variable ghosting
            }

            if(o.usingCouchPotato && o.couchpotatoURLRoot && o.couchpotatoToken) {
                o.couchpotatoURL = `${ items.couchpotatoURLRoot }/api/${encodeURIComponent(o.couchpotatoToken)}`;
            } else {
                delete o.couchpotatoURL; // prevent variable ghosting
            }

            if(o.usingWatcher && o.watcherURLRoot && o.watcherToken) {
                o.watcherURL = o.watcherURLRoot;
            } else {
                delete o.watcherURL; // prevent variable ghosting
            }

            if(o.usingRadarr && o.radarrURLRoot && o.radarrToken) {
                o.radarrURL = o.radarrURLRoot;
            } else {
                delete o.radarrURL; // prevent variable ghosting
            }

            if(o.usingSonarr && o.sonarrURLRoot && o.sonarrToken) {
                o.sonarrURL = o.sonarrURLRoot;
            } else {
                delete o.sonarrURL; // prevent variable ghosting
            }

            resolve(o);
        }

        PLUGN_STORAGE.get(null, options => {
            if(chrome.runtime.lastError)
                chrome.storage.local.get(null, handleOptions);
            else
                handleConfiguration(options);
        });
    });
}

// self explanatory, returns an object; sets the configuration variable
function parseConfiguration() {
    return getConfiguration().then(options => {
        PLUGN_CONFIGURATION = options;

        if((PLUGN_DEVELOPER = options.ExtensionBranchType) && !parseConfiguration.gotConfig) {
            parseConfiguration.gotConfig = true;
            PLUGN_TERMINAL =
                PLUGN_DEVELOPER?
                    console:
                { error: m => m, info: m => m, log: m => m, warn: m => m, group: m => m, groupEnd: m => m };

            PLUGN_TERMINAL.warn(`PLUGN_DEVELOPER: ${PLUGN_DEVELOPER}`);
        }

        return options;
    }, error => { throw error });
}

chrome.storage.onChanged.addListener(async(changes, namespace) => {
    await parseConfiguration();
});

(async() => {
    await parseConfiguration();
})();

function RandomName(length = 16, symbol = '') {
    let values = [];

    window.crypto.getRandomValues(new Uint32Array(length)).forEach((value, index, array) => values.push(value.toString(36)));

    return values.join(symbol).replace(/^[^a-z]+/i, '');
};

let handle = async(results, tabID, instance, script, type) => {
    let InstanceWarning = `[${ type.toUpperCase() }:${ script }] Instance failed to execute @${ tabID }#${ instance }`,
        InstanceType = type;

    if((!results || !results[0] || !instance) && !FOUND[instance])
        try {
            instance = RandomName();
            tabchange([ TAB ]);
            return;
        } catch(error) {
            return PLUGN_TERMINAL.warn(InstanceWarning);
        }

    let data = await results[0];

    if(typeof data == 'number') {
        if(handle.timeout)
            return /* already running */;

        return handle.timeout = setTimeout(() => { let { request, sender, callback } = (processMessage.properties || {}); handle.timeout = null; processMessage(request, sender, callback) }, data);
    } else if(typeof data == 'string') {
        let R = RegExp;

        if(/^<([^<>]+)>$/.test(data))
            return PLUGN_TERMINAL.warn(`The instance requires the "${ R.$1 }" permission: ${ instance }`);

        data.replace(/^([^]+?)\s*\((\d{4})\):([\w\-]+)$/);

        let title = R.$1,
            year  = R.$2,
            type  = R.$3;

        data = { type, title, year };
    }

    if(typeof data == 'number')
        return setTimeout(() => { let { request, sender, callback } = (processMessage.properties || {}); processMessage(request, sender, callback) }, data);
    if(typeof data != 'object')
        return /* setTimeout */;

    try {
        if(data instanceof Array) {
            data = data.filter(d => d);

            if(data.length > 1) {
                chrome.tabs.sendMessage(tabID, { data, script, instance, instance_type: InstanceType, type: 'POPULATE' });
                return /* done */;
            }

            /* the array is too small to parse, set it as a single item */
            data = data[0];
        }

        let { type, title, year } = data;

        title = title
            .replace(/[\u2010-\u2015]/g, '-') // fancy hyphen
            .replace(/[\u201a\u275f]/g, ',') // fancy comma
            .replace(/[\u2018\u2019\u201b\u275b\u275c]/g, "'") // fancy apostrophe
            .replace(/[\u201c-\u201f\u275d\u275e]/g, '"'); // fancy quotation marks
        year = +year;

        data = { ...data, type, title, year };

        chrome.tabs.insertCSS(tabID, { file: 'sites/common.css' });
        chrome.tabs.sendMessage(tabID, { data, script, instance, instance_type: InstanceType, type: 'POPULATE' });
    } catch(error) {
        throw new Error(InstanceWarning + ' - ' + String(error));
    }
};

let running = [], instance = RandomName(), TAB, cache = {};

/* Handle script/plugin events */
let tabchange = async tabs => {
    let tab = tabs[0];

    if(!tab || FOUND[instance]) return;

    TAB = tab;

    let id  = tab.id,
        url = tab.url,
        org, ali, js,
        type, cached,
        allowed;

    if(
        !url
        || /^(?:chrome|debugger|view-source)/i.test(url)
        // || (!!~running.indexOf(id) && !!~running.indexOf(instance))
    )
        return /*
            Stop if:
                a) There isn't a url
                b) The url is a chrome url
                c) The tab AND instance are accounted for
        */;

    url  = new URL(url);
    org  = url.origin;
    ali  = url.host.replace(/^(ww\w+\.|\w{2}\.)/i, '');
    type = (load(`builtin:${ ali }`) + '') == 'true'? 'script': 'plugin';
    js   = load(`${ type }:${ ali }`);
    code = cache[ali];
    allowed = await GetConsent(ali, type == 'script');

    if(!allowed || !js) return;

    if(code) {
        chrome.tabs.executeScript(id, { file: 'helpers.js' }, () => {
            // Sorry, but the instance needs to be callable multiple times
            chrome.tabs.executeScript(id, { code }, results => handle(results, id, instance, js, type));
        });

        return setTimeout(() => cache = {}, 1e6);
    }

    let name = (!PLUGN_DEVELOPER? instance: `top.${ instance }`); // makes debugging easier

    let file = (PLUGN_DEVELOPER)?
                    (type === 'script')?
                        chrome.runtime.getURL(`cloud/${ js }.js`):
                    chrome.runtime.getURL(`cloud/plugin.${ js }.js`):
                `https://ephellon.github.io/web.to.plex/${ type }s/${ js }.js`;

    fetch(file, { mode: 'cors' })
        .then(response => response.text())
        .then(code => {
            chrome.tabs.executeScript(id, { file: 'helpers.js' }, () => {
                // Sorry, but the instance needs to be callable multiple times
                chrome.tabs.executeScript(id, { code:
                    (LAST = cache[ali] =
`/* ${ type }* (${ (!PLUGN_DEVELOPER? 'on':'off') }line) - "${ url.href }" */
${ name } = (${ name } || (${ name }$ = $ => {
'use strict';

if(${ allowed } === false)
    return '<allowed>';

/* Start Injected */
${ code }
/* End Injected */

let InjectedReadyState;

top.addEventListener('popstate', ${ type }.init);
top.addEventListener('pushstate-changed', ${ type }.init);

return (${ type }.RegExp = RegExp(
    ${ type }.url
    /*.replace(/\\|.*?(\\)|$)/g,'')*/
    .replace(/^\\*\\:/,'\\\\w{3,}:')
    .replace(/\\*\\./g,'([^\\\\.]+\\\\.)?')
    .replace(/\\/\\*/g,'/[^$]*'),'i')
).test
(location.href)?
/* URL matches pattern */
    ${ type }.ready?
    /* Injected file has the "ready" property */
    (InjectedReadyState =
        ${ type }.ready.constructor.name == 'AsyncFunction'?
        /* "ready" is an async function */
            ${ type }.ready():
        /* "ready" is a sync (normal) function */
        ${ type }.ready()
    )?
        /* Injected file is ready */
            ${ type }.init( InjectedReadyState ):
        /* Injected file isn't ready */
        (${ type }.timeout || 1000):
    /* Injected file doesn't have the "ready" property */
    ${ type }.init():
/* URL doesn't match pattern */
(console.warn("The domain '${ org }' (" + location.href + ") does not match the domain pattern '" + ${ type }.url + "' (" + ${ type }.RegExp + ")"), 5000);
})(document.queryBy));

console.log('[${ name }]', ${ name });

top.onlocationchange = (event) => chrome.runtime.sendMessage({ type: '$INIT$', options: { ${ type }: '${ js }' } }, callback => callback);

;${ name };`
                ) }, results => handle(results, LAST_ID = id, LAST_INSTANCE = instance, LAST_JS = js, LAST_TYPE = type))
            })
        })
        .then(() => running.push(id, instance))
        .catch(error => { throw error });
};

// listen for message event
let processMessage;

chrome.runtime.onMessage.addListener(processMessage = async(request, sender, callback) => {
    let { options } = request,
        tab = TAB || {},
        { id, url, href } = tab,
        org;

    processMessage.properties = { request, sender, callback };

    if(
        !url
        || /^(?:chrome|debugger|view-source)/i.test(url)
        // || (!!~running.indexOf(id) && !!~running.indexOf(instance))
    )
        return /*
            Stop if:
                a) There isn't a url
                b) The url is a chrome url
                c) The tab AND instance are accounted for
        */;

    url = new URL(url);
    org = url.origin;

    let name = (!PLUGN_DEVELOPER? instance: `top.${ instance }`); // makes debugging easier

    if(request && request.options) {
        let { type } = request,
            { plugin, script } = options,
            _type = type.toLowerCase(),
            allowed;

        type = type.toUpperCase();

        let file = (PLUGN_DEVELOPER)?
                        (_type === 'script')?
                            chrome.runtime.getURL(`cloud/${ script }.js`):
                        chrome.runtime.getURL(`cloud/plugin.${ plugin }.js`):
                    `https://ephellon.github.io/web.to.plex/${ _type }s/${ options[_type] }.js`;

        switch(type) {
            case 'PLUGIN':
                allowed = await GetConsent(plugin, false);

                fetch(file, { mode: 'cors' })
                    .then(response => response.text())
                    .then(code => {
                        chrome.tabs.executeScript(id, { file: 'helpers.js' }, () => {
                            // Sorry, but the instance needs to be callable multiple times
                            chrome.tabs.executeScript(id, { code:
                                (LAST = cache[plugin] =
`/* plugin (${ (!PLUGN_DEVELOPER? 'on':'off') }line) - "${ url.href }" */
${ name } = (${ name } || (${ name }$ = $ => {
'use strict';

if(${ allowed } === false)
    return '<allowed>';

/* Start Injected */
${ code }
/* End Injected */

let PluginReadyState;

top.addEventListener('popstate', plugin.init);
top.addEventListener('pushstate-changed', plugin.init);

return (plugin.RegExp = RegExp(
    plugin.url
    /*.replace(/\\|.*?(\\)|$)/g,'')*/
    .replace(/^\\*\\:/,'\\\\w{3,}:')
    .replace(/\\*\\./g,'([^\\\\.]+\\\\.)?')
    .replace(/\\/\\*/g,'/[^$]*'),'i')
).test
(location.href)?
/* URL matches pattern */
    plugin.ready?
    /* Plugin has the "ready" property */
    (PluginReadyState =
        plugin.ready.constructor.name == 'AsyncFunction'?
        /* "ready" is an async function */
            plugin.ready():
        /* "ready" is a sync (normal) function */
        plugin.ready()
    )?
        /* Plugin is ready */
            plugin.init( PluginReadyState ):
        /* Script isn't ready */
        (plugin.timeout || 1000):
    /* Plugin doesn't have the "ready" property */
    plugin.init():
/* URL doesn't match pattern */
(console.warn("The domain '${ org }' (" + location.href + ") does not match the domain pattern '" + plugin.url + "' (" + plugin.RegExp + ")"), 5000);
})(document.queryBy));

console.log('[${ name }]', ${ name });

top.onlocationchange = (event) => chrome.runtime.sendMessage({ type: '$INIT$', options: { plugin: '${ plugin }' } }, callback => callback);

;${ name };`
) }, results => handle(results, LAST_ID = id, LAST_INSTANCE = instance, LAST_JS = plugin, LAST_TYPE = type))
                        })
                    })
                    .then(() => running.push(id, instance))
                    .catch(error => { throw error });
                break;

            case 'SCRIPT':
            allowed = await GetConsent(script, true);

            fetch(file, { mode: 'cors' })
                .then(response => response.text())
                .then(code => {
                    chrome.tabs.executeScript(id, { file: 'helpers.js' }, () => {
                        // Sorry, but the instance needs to be callable multiple times
                        chrome.tabs.executeScript(id, { code:
                            (LAST = cache[script] =
`/* script (${ (!PLUGN_DEVELOPER? 'on':'off') }line) - "${ url.href }" */
${ name } = (${ name } || (${ name }$ = $ => {
'use strict';

if(${ allowed } === false)
    return '<allowed>';

/* Start Injected */
${ code }
/* End Injected */

let ScriptReadyState;

top.addEventListener('popstate', script.init);
top.addEventListener('pushstate-changed', script.init);

return (script.RegExp = RegExp(
    script.url
    // .replace(/\\|.*?(\\)|$)/g,'')
    .replace(/^\\*\\:/,'\\\\w{3,}:')
    .replace(/\\*\\./g,'([^\\\\.]+\\\\.)?')
    .replace(/\\/\\*/g,'/[^$]*'),'i')
).test
(location.href)?
/* URL matches pattern */
    script.ready?
    /* Script has the "ready" property */
    (ScriptReadyState =
        script.ready.constructor.name == 'AsyncFunction'?
        /* "ready" is an async function */
            script.ready():
        /* "ready" is a sync (normal) function */
        script.ready()
    )?
        /* Script is ready */
            script.init( ScriptReadyState ):
        /* Script isn't ready */
        (script.timeout || 1000):
    /* Script doesn't have the "ready" property */
    script.init():
/* URL doesn't match pattern */
(console.warn("The domain '${ org }' (" + location.href + ") does not match the domain pattern '" + script.url + "' (" + script.RegExp + ")"), 5000);
})(document.queryBy));

console.log('[${ name }]', ${ name });

top.onlocationchange = (event) => chrome.runtime.sendMessage({ type: '$INIT$', options: { script: '${ script }' } }, callback => callback);

;${ name };`
) }, results => handle(results, LAST_ID = id, LAST_INSTANCE = instance, LAST_JS = script, LAST_TYPE = type))
                    })
                })
                .then(() => running.push(id, instance))
                .catch(error => { throw error });
                break;

            case '_INIT_':
                chrome.tabs.executeScript(id, { code: LAST }, results => handle(results, LAST_ID, LAST_INSTANCE, LAST_JS, LAST_TYPE));
                break;

            case '$INIT$':
                chrome.tabs.getCurrent(tab => {
                    instance = RandomName();

                    setTimeout(() => tabchange([ tab ]), 5000);
                });
                break;

            case 'FOUND':
                FOUND[request.instance] = request.found;
                break;

            default:
                instance = RandomName();
                return false;
        };
    }

    return true;
});

// this doesn't actually work...
chrome.tabs.onActiveChanged.addListener(tabchange);

// workaround for the above
chrome.tabs.onActivated.addListener(change => {
    instance = RandomName();

    chrome.tabs.get(change.tabId, tab => tabchange([ tab ]));
});

let refresh;

chrome.tabs.onUpdated.addListener(refresh = (ID, change, tab) => {
    instance = RandomName();

    if(change.status == 'complete' && !tab.discarded)
        tabchange([ tab ]);
    else if(!tab.discarded)
        setTimeout(() => refresh(ID, change, tab), 1000);
});

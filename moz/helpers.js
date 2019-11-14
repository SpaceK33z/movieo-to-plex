async function load(name = '') {
	if(!name) return;

	let HELPERS_STORAGE = chrome.storage.sync || chrome.storage.local;

	name = '~/cache/' + (name.toLowerCase().replace(/\s+/g, '_'));

	return new Promise((resolve, reject) => {
		function LOAD(DISK) {
			let data = JSON.parse(DISK[name] || null);

			return resolve(data);
		}

		HELPERS_STORAGE.get(null, DISK => {
			if(chrome.runtime.lastError)
				chrome.runtime.lastError.message ||
				chrome.storage.local.get(null, LOAD);
			else
				LOAD(DISK);
		});
	});
}

async function save(name = '', data) {
	if(!name) return;

	let HELPERS_STORAGE = chrome.storage.sync || chrome.storage.local;

	name = '~/cache/' + (name.toLowerCase().replace(/\s+/g, '_'));
	data = JSON.stringify(data);

	await HELPERS_STORAGE.set({[name]: data}, () => data);

	return name;
}

async function kill(name) {
	let HELPERS_STORAGE = chrome.storage.sync || chrome.storage.local;

	return HELPERS_STORAGE.remove(['~/cache/' + (name.toLowerCase().replace(/\s+/g, '_'))]);
}

async function Notify(state, text, timeout = 7000, requiresClick = true) {
	return top.postMessage({ type: 'NOTIFICATION', data: { state, text, timeout, requiresClick } }, '*');
}

<<<<<<< Updated upstream
async function Require(permission, name, alias) {
	let allowed = await load(`has/${ name }`),
		allotted = await load(`get/${ name }`);

	top.postMessage({ type: 'PERMISSION', data: { permission, name, alias, allowed, allotted } });
=======
async function Require(permission, name, alias, instance) {
	let allowed = await load(`has/${ name }`),
		allotted = await load(`get/${ name }`);

	top.postMessage({ type: 'PERMISSION', data: { instance, permission, name, alias, allowed, allotted } });
>>>>>>> Stashed changes

	/* Already asked for permission */
	if(typeof allowed == 'boolean')
		/* The allowed permission(s) */
		return allotted;
}

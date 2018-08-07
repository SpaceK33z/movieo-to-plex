/* global parseOptions, modifyPlexButton, findPlexMedia */
function isMoviePage() {
	// An example movie page: /movies/3030-the-1517-to-paris.html
	return /\/(movies?|views?)\//.test(window.location.pathname);
}

function isMoviePageReady() {
	return !!document.querySelector('iframe[title*="Disqus"]');
}

function init() {
	if (isMoviePage())
		if (isMoviePageReady())
			initPlexThingy();
		else
			// This almost never happens, but sometimes the page is too slow so we need to wait a bit.
			setTimeout(init, 1000);
}

parseOptions().then(() => {
	window.addEventListener('popstate', init);
	window.addEventListener('pushstate-changed', init);
	init();
});

async function initPlexThingy() {

	let $button = renderPlexButton();
	if (!$button)
		return;

	let $title = document.querySelector('#dle-content .about > h1'),
        $date = document.querySelector('.features > .reset:nth-child(2) a');

	if (!$title || !$date)
		return modifyPlexButton(
			$button,
			'error',
			'Could not extract title or year from Flenix'
		),
          null;

    let meta = {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        mode: 'no-cors'
    };

	let title = $title.innerText.trim(),
	    year = $date.innerText,
        type = 'movie';
    
    let Db = await getIDs({ title, year, type }),
        IMDbID = Db.imdb,
        TMDbID = Db.tmdb,
        TVDbID = Db.tvdb;

    title = Db.title;
    year = Db.year;

	findPlexMedia({ title, year, button: $button, IMDbID, TMDbID, TVDbID, type, remote: '/engine/ajax/get.php', locale: 'flenix' });
}

function renderPlexButton() {
	// The "download" buttons
	let $downloadButtons = document.querySelectorAll(
		'#dle-content .about > .buttons > a[target="_blank"],\
         #dle-content > .header_tabs > ul > li:last-child,\
         .movieTabs > ul > li:last-child'
	),
        $actions = document.querySelectorAll(
            '#dle-content .about > .buttons,\
             #dle-content > .header_tabs > ul,\
             .movieTabs > ul'
    );

	if (!$actions)
		return;

	let $existingButton = document.querySelectorAll('a.web-to-plex-button');
	if ($existingButton)
		$existingButton.forEach(e => e.remove());

    let els = [];
	$actions.forEach((e, i) => {
        let pa = document.createElement('li'),
            el = document.createElement('a'),
            li = /^[ou]l$/i.test(e.tagName);

        pa.classList.add('web-to-plex-wrapper');
        el.textContent = 'Web to Plex+';
        el.title = 'Loading...';
	    el.classList.add((li? 'flatButton': 'roundButton'), 'web-to-plex-button');
        e.appendChild(li? (pa.appendChild(el), pa): el);

        return els.push(el);
    });

	return els;
}

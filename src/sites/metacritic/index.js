/* global wait, modifyPlexButton, parseOptions, findPlexMedia */
function init() {
	wait(
		() => document.readyState === 'complete',
		() => initPlexThingy(isMovie()? 'movie': isShow()? 'tv': null) || isList()? initList(): null
	);
}

function isMovie() {
	return /^\/movie\//i.test(window.location.pathname);
}

function isShow() {
	return /^\/tv\//i.test(window.location.pathname);
}

function isList() {
	return /(^\/list\/)/i.test(window.location.pathname);
}

async function initPlexThingy(type) {
	let button = renderPlexButton();

	if (!button || !type)
		return /* Fatal Error: Fail Silently */;

	let $title = document.querySelector('.product_page_title > *, .product_title'),
        $date = document.querySelector('.product_page_title > .release_year, .product_data .release_data'),
        $image = document.querySelector('.summary_img');

	if (!$title || !$date)
		return console.log('failed'), modifyPlexButton(
			button,
			'error',
			 `Could not extract ${ !$title? 'title': 'year' } from Metacritic`
		);

	let title = $title.textContent.replace(/\s+/g, ' ').trim(),
        year = $date.textContent.replace(/\s+/g, ' ').replace(/.*(\d{4}).*$/, '$1').trim(),
        image = ($image || {}).src;

    let Db = await getIDs({ title, year, type }),
        IMDbID = Db.imdb,
        TMDbID = Db.tmdb,
        TVDbID = Db.tvdb;

    title = Db.title;
    year = Db.year;

    type = type === 'tv'? 'show': type;

	findPlexMedia({ title, year, button, type, IMDbID, TMDbID, TVDbID });
}

async function initList() {
	/* Not implemented... Metacritic has too much sh*t loading to even try to open a console */
	/* Targeted for v5/v6 */
}

parseOptions().then(() => {
	init();
});

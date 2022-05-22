((E) => {
	'use strict';

	window.addEventListener('DOMContentLoaded', init, { once: true, passive: true });

	E.ENDPOINT_ESI = 'https://esi.evetech.net/dev';
	E.ENDPOINT_ZKB = 'https://zkillboard.com/api';

	E.TYPE_IDS_IGNORED = [
		33328,
		33474,
		33475,
		57319,
		670,
		NaN,
		null,
		undefined,
	];

	E.THOUSAND = 1_000;
	E.MILLION  = 1_000 * E.THOUSAND;
	E.BILLION  = 1_000 * E.MILLION;
	E.TRILLION = 1_000 * E.BILLION;

	E.humanisePlural = humanisePlural;
	E.humaniseCount  = humaniseCount;
	E.humaniseDate   = humaniseDate;
	E.humaniseTime   = humaniseTime;
	E.humaniseIsk    = humaniseIsk;
	E.getIskScale    = getIskScale;


	function init() {
		const dom = {
			controls: document.getElementById('Controls'),
			overview: document.getElementById('Overview'),
		};

		const ui = {
			lookup: E.Lookup({ onResolved: fetchSystems }),
		};

		clearOverview();

		dom.controls.appendChild(ui.lookup.render());

		ui.lookup.setFocus();


		function fetchSystems(systemIds = []) {
			clearOverview();

			Promise.any(systemIds.map((systemId) => fetchSystem(systemId)))
				.then(updateOverview)
				.catch(console.error)
			;
		}


		function fetchSystem(systemId) {
			const system = E.System(systemId);

			dom.overview.appendChild(system.render());

			E.libCache.getItem(`systemIds/${systemId}`)
				.then(()  => { doFetch(); })
				.catch(() => {
					E.libCache.saveItem(`systemIds/${systemId}`, systemId);
					doFetch();
				})
			;


			function doFetch() {
				setTimeout(() => system.fetchDetails(), getRandomDelay());
			}
		}


		function getRandomDelay() { return Math.round((Math.random() * 7)); }


		function updateOverview(pilots) {
			dom.overview.classList.toggle('hidden', (pilots?.length <= 0));
			E.libCache.clearExpired();
		}


		function clearOverview() {
			E.libNet.resetTimedQueryCount();
			dom.overview.classList.toggle('hidden', true);
			dom.overview.replaceChildren();
		}
	}


	function humanisePlural(value, singular, plural) {
		return (value === 1)
			? `${humaniseCount(value)} ${singular}`
			: `${humaniseCount(value)} ${plural || singular}`
		;
	}


	function humaniseCount(value = 0) {
		if (value > 1000) { return `${(value / 1000).toFixed(1)}k`; }
		return value;
	}


	function humaniseDate(date = new Date()) {
		return date?.toLocaleDateString() || '???';
	}


	function humaniseIsk(isk = 0) {
		if ((isk >= E.TRILLION)) { return `${(isk / E.TRILLION).toFixed(1)}T ISK`; }
		if ((isk >= E.BILLION))  { return `${(isk / E.BILLION).toFixed(1)}B ISK`; }
		if ((isk >= E.MILLION))  { return `${(isk / E.MILLION).toFixed(1)}M ISK`; }
		if ((isk >= E.THOUSAND)) { return `${(isk / E.THOUSAND).toFixed(1)}k ISK`; }

		return `${isk.toFixed(1)} ISK`;
	}


	function getIskScale(isk = 0) {
		if (isk >= E.BILLION)  { return 'high'; }
		if (isk >= E.MILLION)  { return 'medium'; }
		if (isk >= E.THOUSAND) { return 'low'; }
		return 'none';
	}


	function humaniseTime(date = new Date()) {
		const hours   = date.getHours().toString().padStart(2, 0);
		const minutes = date.getMinutes().toString().padStart(2, 0);

		return `${hours}:${minutes}`;
	}


})((window.E = {}));

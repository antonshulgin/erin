((E) => {
	'use strict';

	const TEMPLATE = document.getElementById('templateSystem');

	E.System = (systemId) => {
		const root = document.importNode(TEMPLATE.content, true).firstChild;
		const dom  = {
			summary:         root.querySelector('.System-summary'),
			name:            root.querySelector('.System-name'),
			status:          root.querySelector('.System-status'),
			encounters:      root.querySelector('.System-encounters'),
			iskDestroyed:    root.querySelector('.System-isk-destroyed'),
			doGetEncounters: root.querySelector('.System-do-get-encounters'),
		};

		dom.doGetEncounters.addEventListener('click', fetchDetails, { passive: true });

		return {
			render,
			fetchDetails,
			getId,
		};


		function fetchDetails() {
			fetchInfo();
			fetchEncounters();
		}


		function fetchEncounters() {
			markBusy();

			E.libNet.load(`${E.ENDPOINT_ZKB}/losses/solarSystemID/${getId()}/`, true)
				.then((zkbStubs) => parseEncounters(zkbStubs))
				.then(markReady)
				.catch(markFailed)
			;


			function markBusy() {
				root.dataset.stateEncounters    = 'loading';
				dom.doGetEncounters.textContent = 'Getting encounters';
			}


			function markReady() {
				root.dataset.stateEncounters    = 'ready';
				dom.doGetEncounters.textContent = 'Get encounters';
			}


			function markFailed(error) {
				console.error(error);
				dom.doGetEncounters.textContent = 'Could not';

				setTimeout(() => {
					root.dataset.stateEncounters    = 'failed';
					dom.doGetEncounters.textContent = 'Get encounters';
				}, 1000);
			}
		}


		function parseEncounters(zkbStubs) {
			const recentStubs = zkbStubs
				.filter((zkbStub) => !zkbStub.zkb.npc)
				.slice(0, 13).reduce((out, zkbStub) => {
					out[zkbStub.killmail_id] = zkbStub;
					return out;
				}, {});

			Promise.all(Object.values(recentStubs).map(fetchKillmail))
				.then((killmails) => setEncounters(killmails, recentStubs))
				.catch(console.error)
			;
		}


		function fetchKillmail(zkbStub = {}) {
			return E.libNet.load(`${E.ENDPOINT_ESI}/killmails/${zkbStub.killmail_id}/${zkbStub.zkb.hash}`);
		}


		function setEncounters(killmails = [], recentStubs = {}) {
			const genuineKillmails = [ ...killmails ]
				.sort(sortById)
				.filter(filterGenuine)
				.filter(filterRecents)
			;

			const encounters = genuineKillmails.map((km) => E.Encounter(km, recentStubs[km.killmail_id]));

			encounters.forEach((encounter) => encounter.fetchDetails());

			dom.encounters.replaceChildren(...encounters.map((encounter) => encounter.render()));

			parseIskDestroyed(genuineKillmails, recentStubs);
		}


		function sortById(kmA, kmB) {
			return (kmB.killmail_id - kmA.killmail_id);
		}


		function filterGenuine(km) {
			return !E.TYPE_IDS_IGNORED.includes(km.victim.ship_type_id);
		}


		function filterRecents(km) {
			const dateKm   = new Date(km.killmail_time);
			const dateNow  = new Date();
			const dateDiff = Math.abs(dateKm - dateNow);

			return (dateDiff <= (1000 * 60 * 60));
		}


		function parseIskDestroyed(killmails = [], zkbStubs = {}) {
			const iskDestroyed = killmails.reduce((out, killmail) => {
				const zkbStub = zkbStubs[killmail.killmail_id];
				return out + (zkbStub?.zkb?.totalValue || 0);
			}, 0);

			dom.iskDestroyed.dataset.threat = E.getIskScale(iskDestroyed);
			dom.iskDestroyed.textContent    = (iskDestroyed > 0)
				? `${E.humaniseIsk(iskDestroyed)} destroyed`
				: 'CLEAR'
			;
		}


		function fetchInfo() {
			E.libNet.load(`${E.ENDPOINT_ESI}/universe/systems/${getId()}/`)
				.then(doResolve)
				.catch(doReject)
			;


			function doResolve(info) {
				setName(info.name);
				setStatus(info.security_status);
			}


			function doReject(event) {
				dom.portrait.classList.toggle('busy', false);
				console.error('Failed to load system info', { event });
			}
		}


		function setStatus(status = 0) {
			status = status.toFixed(1) || 'N/A';
			dom.status.dataset.status = humaniseSecurityStatus(status);
			dom.status.textContent    = status;
			dom.status.classList.toggle('busy', false);
		}


		function humaniseSecurityStatus(status = 0) {
			if (status <= 0)  { return 'high'; }
			if (status < 0.5) { return 'medium'; }
			if (status < 1)   { return 'low'; }
			return 'none';
		}


		function setName(name) {
			dom.name.href        = `https://zkillboard.com/system/${getId()}`;
			dom.name.textContent = name;
		}


		function getId()  { return systemId; }
		function render() { return root; }
	};

})(window.E);

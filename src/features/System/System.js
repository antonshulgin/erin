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
			console.log({ parseEncounters: zkbStubs });

			const recentStubs = zkbStubs
				.filter((zkbStub) => !zkbStub.zkb.npc)
				.slice(0, 33).reduce((out, zkbStub) => {
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
			console.log('setEncounters', { killmails, recentStubs });

			const genuineKillmails = filterGenuineKillmails(killmails);
			const recentKillmails  = filterRecentKillmails(genuineKillmails);
			const sortedKillmails  = sortKillmails(recentKillmails);
			const encounters       = sortedKillmails.map((killmail) => E.Encounter(killmail, recentStubs[killmail.killmail_id]));

			encounters.forEach((encounter) => encounter.fetchDetails());

			dom.encounters.replaceChildren(...encounters.map((encounter) => encounter.render()));

			parseIskDestroyed(recentKillmails, recentStubs);
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


		function sortKillmails(killmails = []) {
			return [ ...killmails ]
				.sort((kmA, kmB) => {
					const timeA = (new Date(kmA.killmail_time)).getTime();
					const timeB = (new Date(kmB.killmail_time)).getTime();
					return (timeB - timeA);
				})
			;
		}


		function filterGenuineKillmails(killmails = []) {
			return killmails.filter((km) => !E.TYPE_IDS_IGNORED.includes(km.victim.ship_type_id));
		}


		function filterRecentKillmails(killmails = []) {
			const MS_HOUR = 1000 * 60 * 60;
			const timeNow = Date.now();

			return killmails.filter((km) => {
				const timeKm = (new Date(km.killmail_time)).getTime();
				const timeDiff = Math.abs(timeKm - timeNow);

				return (timeDiff <= MS_HOUR);
			});
		}


		function fetchInfo() {
			E.libNet.load(`${E.ENDPOINT_ESI}/universe/systems/${getId()}/`)
				.then(doResolve)
				.catch(doReject)
			;


			function doResolve(info) {
				console.log('System.doResolve', { info });
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

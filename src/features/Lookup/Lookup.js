((E) => {
	'use strict';

	const TEMPLATE = document.getElementById('templateLookup');

	const REGEX_SYSTEM_NAME    = /^([a-zA-Z0-9\- ]+)$/;                                            // Just a system name
	const REGEX_ROUTE_CURRENT  = /^Current location: (.+)$/;                                       // Starting point in the route manager
	const REGEX_ROUTE_STOP     = /^•\s+(.+)$/;                                                     // Intermediate system in the route manager
	const REGEX_ROUTE_STATION  = /^\d+\.\s+(.+?)(?:\s[VIX]+?)?\s-/;                                // Station in the route manager
	const REGEX_ROUTE_WAYPOINT = /^\d+\.\s+(.+?)\s\(/;                                             // Waypoint in the route manager
	const REGEX_DSCAN_STARGATE = /^\d+\s+(.+?)\s+Stargate/;                                        // DScan entry
	const REGEX_SYSTEM_LINK    = /<a href=.+>([a-zA-Z0-9\- ]+)<\/a>/;                              // System link
	const REGEX_SYSTEM_LOCAL   = /EVE System > Channel changed to Local\s+:\s+([a-zA-Z0-9\- ]+)$/; // Local system change message


	E.Lookup = (params = {}) => {
		const root = document.importNode(TEMPLATE.content, true).firstChild;

		root.addEventListener('submit', doSubmit);
		root.systems.addEventListener('focus', setFocus);

		return {
			setFocus,
			render,
			parseSystems,
		};

		function render()   { return root; }
		function setFocus() { root.systems.select(); }


		function doSubmit(event) {
			event.preventDefault();

			markBusy();

			Promise.resolve(root.systems.value)
				.then((systemsRaw) => parseSystems(systemsRaw))
				.then((systems)    => fetchSystemIds(systems))
				.then((systemIds)  => doResolve(systemIds))
				.catch(doReject)
			;
		}


		function parseSystems(systemsRaw = '') {
			return new Promise((resolve) => {
				const systems = systemsRaw
					.split(`\n`)
					.map((systemRaw) => systemRaw.trim())
					.reduce((out, systemRaw) => {
						const system = (
							REGEX_SYSTEM_NAME.exec(systemRaw)?.[1]    ||
							REGEX_DSCAN_STARGATE.exec(systemRaw)?.[1] ||
							REGEX_SYSTEM_LINK.exec(systemRaw)?.[1]    ||
							REGEX_SYSTEM_LOCAL.exec(systemRaw)?.[1]   ||
							REGEX_ROUTE_STOP.exec(systemRaw)?.[1]     ||
							REGEX_ROUTE_STATION.exec(systemRaw)?.[1]  ||
							REGEX_ROUTE_CURRENT.exec(systemRaw)?.[1]  ||
							REGEX_ROUTE_WAYPOINT.exec(systemRaw)?.[1]
						);

						if (system && system.length > 0) { out.push(system); }

						return out;
					}, [])
				;

				return resolve(systems);
			});
		}


		function fetchSystemIds(systems = []) {
			return new Promise((resolve, reject) => {
				Promise.all(systems.map(fetchSystemId))
					.then((systemIds) => resolve(systemIds.flat(1)))
					.catch(reject)
				;
			});
		}


		function fetchSystemId(system = '') {
			return new Promise((resolve, reject) => {
				E.libNet.load(`${E.ENDPOINT_ESI}/search/?search=${encodeURIComponent(system)}&categories=solar_system&strict=true`)
					.then(doResolve)
					.catch(reject)
				;


				function doResolve(json) {
					const systemIds = json.solar_system;
					return resolve(systemIds);
				}
			});
		}


		function doResolve(systemIds) {
			markReady();

			return params?.onResolved(systemIds);
		}


		function doReject(event) {
			console.error(event);

			root.doLookup.textContent = 'Could not';
			root.doLookup.classList.toggle('busy', true);

			setTimeout(markIdle, 1000);
		}


		function markBusy() {
			root.doLookup.textContent = 'Working';
			root.doLookup.classList.toggle('busy', true);
		}


		function markReady() {
			root.doLookup.textContent = 'Ready';
			root.doLookup.classList.toggle('busy', true);

			setTimeout(markIdle, 1000);
		}


		function markIdle() {
			root.doLookup.textContent = 'Look up';
			root.doLookup.classList.toggle('busy', false);
		}
	};

})(window.E);

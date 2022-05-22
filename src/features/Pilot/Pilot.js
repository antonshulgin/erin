((E) => {
	'use strict';

	/* eslint camelcase: off */

	const TEMPLATE = document.getElementById('templatePilot');

	E.Pilot = (
		{ character_id, ship_type_id, },
		isCompact = false,
		isVictim  = false,
	) => {
		const root = document.importNode(TEMPLATE.content, true).firstChild;
		const dom  = {
			shipPic: root.querySelector('.Pilot-ship-pic'),
			ship:    root.querySelector('.Pilot-ship'),
			name:    root.querySelector('.Pilot-name'),
		};

		root.dataset.isVictim  = isVictim;
		root.dataset.isCompact = isCompact;

		return {
			fetchDetails,
			getShipId,
			getPilotId,
			render,
		};


		function fetchDetails() {
			fetchInfo();
			fetchShip();
		}


		function fetchInfo() {
			E.libNet.load(`${E.ENDPOINT_ESI}/characters/${getPilotId()}`)
				.then((info) => setName(info.name))
				.catch(doReject)
			;


			function doReject(event) {
				console.error({ fetchInfo: event });
			}
		}


		function fetchShip() {
			E.libNet.load(`${E.ENDPOINT_ESI}/universe/types/${getShipId()}`)
				.then(setShip)
				.catch(console.error)
			;
		}


		function setShip(shipInfo) {
			dom.ship.textContent = shipInfo.name;
			dom.shipPic.src      = `https://images.evetech.net/types/${shipInfo.type_id}/render?size=32`;
			dom.shipPic.alt      = shipInfo.name;
		}


		function setName(name) {
			dom.name.textContent = name;
			dom.name.classList.toggle('busy', false);
		}


		function getShipId()   { return ship_type_id; }
		function getPilotId()  { return character_id; }
		function render()      { return root; }
	};

})(window.E);

((E) => {
	'use strict';

	const TEMPLATE = document.getElementById('templateEncounter');

	E.Encounter = (
		killmail = {},
		zkbStub  = {}
	) => {
		const root = document.importNode(TEMPLATE.content, true).firstChild;
		const dom  = {
			time:         root.querySelector('.Encounter-time'),
			victim:       root.querySelector('.Encounter-victim'),
			attackers:    root.querySelector('.Encounter-attackers'),
			iskDestroyed: root.querySelector('.Encounter-isk-destroyed'),
		};

		setEncounterLink(killmail.killmail_id);
		setEncounterTime(killmail.killmail_time);
		setIskDestroyed(zkbStub.zkb.totalValue);

		return {
			fetchDetails,
			render,
		};

		function setEncounterLink(killmailId) {
			root.href = `https://zkillboard.com/kill/${killmailId}/`;
		}


		function setEncounterTime(killmailTime) {
			dom.time.textContent = E.humaniseTime(new Date(killmailTime));
		}


		function setIskDestroyed(iskDestroyed = 0) {
			dom.iskDestroyed.dataset.threat = E.getIskScale(iskDestroyed);
			dom.iskDestroyed.textContent    = E.humaniseIsk(iskDestroyed);
		}


		function fetchDetails() {
			const attackers = killmail.attackers
				.sort((a, b)         => (b.damage_done - a.damage_done))
				.map((attacker, idx) => E.Pilot(attacker, (idx !== 0), false))
			;

			const victim = E.Pilot(killmail.victim, false, true);

			victim.fetchDetails();
			attackers.map((attacker) => attacker.fetchDetails());

			dom.victim.replaceChildren(victim.render());
			dom.attackers.replaceChildren(...attackers.map((attacker) => attacker.render()));

			console.log({ killmail, attackers, victim });
		}


		function render() { return root; }
	};

})(window.E);

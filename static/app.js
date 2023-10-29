var data = {};
var user = null;
// Default colors
var flag_colors = ["#007bff", "#dc3545", "#ffc107", "#28a745"];

var circle = document.createElementNS("http://www.w3.org/2000/svg", "svg");
circle.setAttribute("width", 16);
circle.setAttribute("height", 16);
circle.setAttribute("fill", "currentColor");
circle.setAttribute("viewBox", "0 0 16 16");
var _circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
_circle.setAttribute("cx", 8);
_circle.setAttribute("cy", 8);
_circle.setAttribute("r", 8);
circle.append(_circle);
// Need jQuery-Object for cloning
circle = $(circle);

scannerChars = {173: "-", 13: "", 16: ""};

$(function () {
	var _timeoutHandler = null;
	var _input = "";

	$(document).keyup(function (e) {
		if (_timeoutHandler != null) {
			clearTimeout(_timeoutHandler);
		}
		var key = e.which in scannerChars ? scannerChars[e.which] : String.fromCharCode(e.which);
		_input += key;
		this._timeoutHandler = setTimeout(function () {
			if (_input.length > 3) {
				$(document).trigger("onbarcodescanned", [_input]);
			}
			_input = "";
		}, 50);
	});
});

$(document).on("onbarcodescanned", function (e, code) {
	if (code.startsWith("A-")) {
		_openAssignmentModal(code.substring(2).toLowerCase());
	}
});

$(function () {
	// Overwrite app_token if one is given
	if (location.hash.length > 1) {
		localStorage.setItem("app_token", location.hash.substring(1));
		location.hash = "";
	}

	var startModal = null;

	socket = ReliableWebSocket({
		on_close: function () {
			$("#socketIndicator").text("Offline").addClass("bg-danger").removeClass("bg-success");
		},
		on_login: function (_user) {
			user = _user;
			$("#socketIndicator").text("Online").addClass("bg-success").removeClass("bg-danger");
			$("#username").text(user.name);
			$("#admin").toggle(("grant" in user && user.grant) || user.role == "admin");
			$("#examinee-add").toggle(user.role == "admin");
			$("#station-add").toggle(user.role == "admin");
			$(".assign-examinee").toggle(user.role == "operator");
		},
		on_auth_required: function (data) {
			if (data.first_login) {
				// Do not open modal over modal
				if (startModal !== null) {
					return;
				}

				startModal = Modal("Erstelle Benutzer");
				var token = _gen_id() + _gen_id();

				function _submit(e) {
					e.preventDefault();
					var token = startModal.elem.find("#token").val();
					localStorage.setItem("app_token", token);
					socket.send({"_m": "_create_user", "token": token, "name": startModal.elem.find("#name").val(), "role": "admin"})
					startModal.close();
				}

				startModal.elem.find(".modal-body").append([
					$("<p>").text("Willkommen beim GA-Prüfungsmonitor. Dieses Tool soll bei der Durchführung der GA-Prüfung unterstützen. Da dies dein erster Aufruf ist, muss ein erster Administrator-Benutzer eingerichtet werden. Anschließend kannst du Stationen und Prüflinge anlegen sowie einen Operator-Benutzer einrichten. Bitte vergebe hier einen Namen für diesen und notiere dir den hier angezeigten Token:"),
					$("<form>").on("submit", _submit).append([
						$("<div>").addClass("mb-3").append([
							$("<label>").attr("for", "token").addClass("col-form-label").text("Token"),
							$("<input>").attr("type", "text").prop("disabled", true).addClass("form-control").attr("name", "token").attr("id", "token").val(token)
						]),
						$("<div>").addClass("mb-3").append([
							$("<label>").attr("for", "token").addClass("col-form-label").text("Name"),
							$("<input>").attr("type", "text").addClass("form-control").attr("name", "name").attr("id", "name").val("Administrator")
						]),
					]),
				]);

				var button = $("<button>").addClass(["btn", "btn-primary"]).text("Anlegen").click(_submit);
				startModal.elem.find(".modal-footer").append(button);
				startModal.show();
				startModal.elem.on("hidden.bs.modal", function () {
					startModal = null;
				});
				startModal.elem.on("shown.bs.modal", function () {
					startModal.elem.find("#name").focus();
				});
			} else {
				// remove invalid token from storage
				if ("message" in data) {
					localStorage.removeItem("app_token");
				}

				// try stored token if one exists
				if (localStorage.getItem("app_token")) {
					socket.send({"_m": "_login", "token": localStorage.getItem("app_token")});
					return;
				}

				if (startModal !== null) {
					return;
				}

				// need to show modal, possibly with message
				startModal = Modal("Anmeldung");

				function _submit(e) {
					e.preventDefault();
					var token = startModal.elem.find("#token").val();
					localStorage.setItem("app_token", token);
					socket.send({"_m": "_login", "token": token});
					startModal.close();
				}

				startModal.elem.find(".modal-body").append([
					$("<p>").text("Willkommen beim GA-Prüfungsmonitor. Dieses Tool soll bei der Durchführung der GA-Prüfung unterstützen. Bitte gebe den Token zur Authentifikation an:"),
					$("<div>").attr("id", "alerts"),
					$("<form>").on("submit", _submit).append([
						$("<div>").addClass("mb-3").append([
							$("<label>").attr("for", "token").addClass("col-form-label").text("Token"),
							$("<input>").attr("type", "text").addClass("form-control").attr("name", "token").attr("id", "token").val(token)
						]),
					]),
				]);

				if ("message" in data) {
					startModal.elem.find("#alerts").append($("<div>").attr("role", "alert").addClass(["alert", "alert-danger"]).text(data.message));
				}

				var button = $("<button>").addClass(["btn", "btn-primary"]).text("Anmelden").click(_submit);
				startModal.elem.find(".modal-footer").append(button);
				startModal.show();
				startModal.elem.on("hidden.bs.modal", function () {
					startModal = null;
				});
				startModal.elem.on("shown.bs.modal", function () {
					startModal.elem.find("#token").focus();
				});
			}
		},
		on_init: function (state) {
			console.log("INIT", state);
			data = state;
			for (const examinee of Object.values(data.examinees)) {
				if (! ("flags" in examinee)) {
					continue;
				}
				for (const flag_color of examinee.flags) {
					if (flag_colors.indexOf(flag_color) < 0) {
						flag_colors.push(flag_color);
					}
				}
			}
			render();
		},
		handlers: {
			"station": function (msg) {
				data.stations[msg.i] = msg;
				render();
			},
			"station_delete": function (msg) {
				data.assignments = Object.fromEntries(Object.entries(data.assignments).filter(([k, assignment]) => assignment.station != msg.i));
				delete data.stations[msg.i];
				render();
			},
			"examinee": function (msg) {
				data.examinees[msg.i] = msg;
				if ("flags" in msg) {
					for (const flag_color of msg.flags) {
						if (flag_colors.indexOf(flag_color) < 0) {
							flag_colors.push(flag_color);
						}
					}
				}
				render();
			},
			"examinee_delete": function (msg) {
				data.assignments = Object.fromEntries(Object.entries(data.assignments).filter(([k, assignment]) => assignment.examinee != msg.i));
				delete data.examinees[msg.i];
				render();
			},
			"assignment": function (msg) {
				data.assignments[msg.i] = msg;
				render();
				$(".examinee-" + msg.examinee).hide().slideDown(1000);
			},
			"users": function (msg) {
				var modal = Modal("Benutzerverwaltung");

				function _create(e) {
					e.preventDefault();

					var user = {
						"token": modal.elem.find("#token").val(),
						"name": modal.elem.find("#username").val(),
						"role": modal.elem.find("#role").val(),
					}
					socket.send({"_m": "_create_user", ...user});
					msg.users[user.token] = user;

					modal.elem.find("#users").append(_buildUserRow(user.token));

					modal.elem.find("#token").val(_gen_id() + _gen_id());
					modal.elem.find("#username").val("").focus();
				}

				function _buildUserRow(u_id) {
					var deleteButton = $("<button>").addClass(["btn", "btn-sm", "btn-danger"]).text("Löschen").click(function () {
						socket.send({"_m": "user_delete", "token": u_id});
						modal.elem.find("#user-" + u_id).remove();
					});
					return $("<tr>").attr("id", "user-" + u_id).append([
						$("<td>").text(msg.users[u_id].name),
						$("<td>").text(msg.users[u_id].role),
						$("<td>").addClass("text-end").append([
							deleteButton,
						])
					]);
				}

				var createButton = $("<button>").addClass(["btn", "btn-sm", "btn-success"]).text("Hinzufügen").click(_create);

				modal.elem.find(".modal-body").append([
					$("<p>").text("Benutzer werden mit Namen und anhand eines geheimen, eindeutigen Tokens identifiziert. Benutzer mit erweiterten Berechtigungen um die Benutzerverwaltung zu bearbeiten sind hier fett markiert. Beachte beim anlegen neuer Benutzer, dass dir der Token nur beim Anlegen angezeigt wird und notiere ihn dir daher unbedingt."),
					$("<table>").addClass(["table", "table-striped"]).append([
						$("<thead>").append(
							$("<tr>").append([
								$("<th>").text("Benutzername"),
								$("<th>").text("Rolle"),
								$("<th>").text(""),
							])
						),
						$("<tbody>").attr("id", "users").append(
							Object.keys(msg.users).map(_buildUserRow)
						),
						$("<tfoot>").append(
							$("<tr>").append(
								$("<th>").attr("colspan", 3).append([
									$("<form>").on("submit", _create).append([
										$("<div>").addClass("mb-3").append([
											$("<label>").attr("for", "token").addClass("col-form-label").text("Token"),
											$("<input>").attr("type", "text").prop("disabled", true).addClass("form-control").attr("id", "token").val(_gen_id() + _gen_id())
										]),
										$("<div>").addClass("mb-3").append([
											$("<label>").attr("for", "username").addClass("col-form-label").text("Benutzername"),
											$("<input>").attr("type", "text").addClass("form-control").attr("id", "username")
										]),
										$("<div>").addClass("mb-3").append([
											$("<label>").attr("for", "role").addClass("col-form-label").text("Rolle"),
											$("<select>").attr("id", "role").addClass("form-select").append([
												$("<option>").attr("value", "admin").text("Administrator"),
												$("<option>").attr("value", "operator").text("Operator"),
												$("<option>").attr("value", "operator-return").text("Beschränkter Operator nur für Rückkehrer"),
												$("<option>").attr("value", "viewer").text("Betrachter"),
											]),
										]),
									]),
									createButton
								])
							)
						)
					])
				]);

				modal.show();
			},
		},
	});

	$("#logout").click(function () {
		localStorage.removeItem("app_token");
		socket.reconnect();
	});

	$("#admin").click(function () {
		socket.send({"_m": "request_users"});
	});

	$("#examinee-add").click(function () {
		_openExamineeEditModal(null);
	});

	$("#station-add").click(function () {
		_openStationEditModal(null);
	});

	setInterval(function () {
		$(".best-before").each(function (_i, elem) {
			$(elem).toggleClass(["text-danger"], Date.now() / 1000 > $(elem).data("best-before"));
		});
	}, 1000);
});

function _openExamineeEditModal(e_id) {
	var modal = Modal(e_id === null ? "Prüflinge eintragen" : "Prüfling " + data.examinees[e_id].name + " bearbeiten");

	function _submit(e) {
		e.preventDefault();

		var flags = modal.elem.find("#flags").find(".btn-outline-dark").map((_i, btn) => $(btn).data("color")).get();

		for (var name of modal.elem.find("#names").val().split("\n").values()) {
			name = name.trim();
			if (name != "") {
				socket.send({"_m": "examinee", "i": e_id === null ? _gen_id() : e_id, "name": name, "priority": modal.elem.find("#priority").val(), "flags": flags});
			}
		}

		modal.close();
	}

	function _generateFlagButton(color) {
		var checked = false;
		if (e_id !== null && "flags" in data.examinees[e_id]) {
			checked = data.examinees[e_id].flags.indexOf(color) >= 0;
		}

		return $("<button>").attr("type", "button").addClass("btn").data("color", color).css("color", color).toggleClass("btn-outline-dark", checked).append(circle.clone()).click(function () {
			$(this).toggleClass("btn-outline-dark", ! $(this).hasClass("btn-outline-dark"));
		})
	}

	modal.elem.find(".modal-body").append([
		$("<p>").text("Prüflinge werden primär anhand ihres Namens verwaltet. Dieses Formular erlaubt es, einen oder mehrere Prüflinge anzulegen. Die Prüflinge müssen dabei mit einem Namen und OV pro Zeile angegeben werden (z.B. ODAR Markus Kaup) - die OV-Kürzel werden verwendet um möglichst verschiedene OVs zu einer Station zu entsenden. Die Priorität verschafft Prüflingen einen virtuellen Zeitvorsprung, damit ihre Prüfung früher beendet wird (z.B. für Jugend-Goldabzeichen):"),
		$("<form>").on("submit", _submit).append([
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "priority").addClass("col-form-label").text("Priorität"),
				$("<input>").attr("type", "number").addClass("form-control").attr("id", "priority").val(e_id === null ? "100" : data.examinees[e_id].priority)
			]),
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "flags").addClass("col-form-label").text("Markierungen"),
				$("<div>").append([
					$("<span>").attr("id", "flags").append(
						flag_colors.map(_generateFlagButton)
					),
					$("<span>").addClass("ms-3").append([
						$("<input>").attr("type", "color").addClass(["form-control", "form-control-color", "d-inline-block"]).attr("id", "flag-add-color"),
						$("<button>").addClass(["btn", "btn-primary"]).text("+").click(function (e) {
							e.preventDefault();
							modal.elem.find("#flags").append(_generateFlagButton(modal.elem.find("#flag-add-color").val()))
						}),
					]),
				]),
			]),
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "names").addClass("col-form-label").text("Namen"),
				e_id === null ? $("<textarea>").addClass("form-control").attr("rows", 15).attr("id", "names") : $("<input>").attr("type", "text").addClass("form-control").attr("id", "names").val(data.examinees[e_id].name),
			]),
		]),
	]);

	var button = $("<button>").addClass(["btn", "btn-primary"]).text("Speichern").click(_submit);
	modal.elem.find(".modal-footer").append(button);
	modal.show();
	modal.elem.on("shown.bs.modal", function () {
		modal.elem.find("#names").focus();
	});
}

function _openStationEditModal(s_id) {
	var modal = Modal(s_id === null ? "Station anlegen" : "Station " + data.stations[s_id].name + " bearbeiten");

	function _submit(e) {
		e.preventDefault();

		var tasks = [];
		var currentTask = null;
		for (var line of (modal.elem.find("#tasks").val() + "\n").split("\n")) {
			line = line.trim();
			if (line == "") {
				// blank line, add current task if existant
				if (currentTask !== null) {
					tasks.push(currentTask);
					currentTask = null;
				}
			} else if (currentTask === null) {
				// First line of a Task (count of required parts & name)
				var _words = line.split(" ");
				var min_tasks = parseInt(_words.shift());
				currentTask = {"name": _words.join(" "), "min_tasks": min_tasks, "parts": []};
			} else {
				// must be a singe task, prefixed with P or O
				currentTask.parts.push({"name": line.substring(2), "mandatory": line.substring(0, 1) != "O"});
			}
		}

		socket.send({"_m": "station", "i": s_id || _gen_id(), "name": modal.elem.find("#name").val(), "tasks": tasks});

		modal.close();
	}

	var _tasks = "";
	if (s_id !== null) {
		var task_definitions = data.stations[s_id].tasks.map((task) => task.min_tasks + " " + task.name + "\n" + task.parts.map((p) => (p.mandatory ? "P " : "O ") + p.name).join("\n"));
		_tasks = task_definitions.join("\n\n");
	}

	var predefinedTasks = $("<select>").prop("multiple", true).attr("size", 7).addClass("form-select").attr("id", "predefined_tasks").append(
		tasks.map(function (task) {
			var _preset = task.min_tasks + " " + task.name + "\n" + task.parts.map((p) => (p.mandatory ? "P " : "O ") + p.name).join("\n");
			return $("<option>").data("preset", _preset).text(task.name);
		})
	).change(function () {
		var taskDescription = $(this).find("option:selected").map(function (_i, elem) {
			return $(elem).data("preset");
		}).get().join("\n\n");
		modal.elem.find("#tasks").val(taskDescription);
	});

	modal.elem.find(".modal-body").append([
		$("<p>").text("An Prüfungsstationen werden die praktischen Prüfungsaufgaben bearbeitet. Jeder Prüfling muss jede Station alleine bearbeiten. Die Aufgaben werden verwendet um die Laufzettel zu befüllen: Aus einer Vorauswahl können Einträge ausgewählt werden oder eine eigene Definition kann eingegeben werden."),
		$("<form>").on("submit", _submit).append([
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "name").addClass("col-form-label").text("Name"),
				$("<input>").attr("type", "text").addClass("form-control").attr("id", "name").val(s_id === null ? "" : data.stations[s_id].name)
			]),
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "predefined_tasks").addClass("col-form-label").text("Vordefinierte Aufgaben"),
				predefinedTasks
			]),
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "tasks").addClass("col-form-label").text("Aufgaben"),
				$("<textarea>").attr("rows", 7).addClass("form-control").attr("id", "tasks").val(_tasks),
			]),
		]),
	]);

	var button = $("<button>").addClass(["btn", "btn-primary"]).text("Speichern").click(_submit);
	modal.elem.find(".modal-footer").append(button);
	modal.show();
	modal.elem.on("shown.bs.modal", function () {
		modal.elem.find("#name").focus();
	});
}

var tasks = [
	{"name": "3.1 Verbinden zweier Leinen mit dem Doppelstich", "min_tasks": 2, "parts": [
		{"name": "Doppelstich richtig ausgeführt", "mandatory": true},
		{"name": "Überhang der freien Leinenenden mindestens 10x Leinendurchmesser", "mandatory": false},
		{"name": "Auf parallele Leinenführung ist zu achten", "mandatory": false},
	]},
	{"name": "3.2 Aufschießen einer Arbeitsleine", "min_tasks": 4, "parts": [
		{"name": "Freies Leinenende etwas kürzer als der normale Schlag", "mandatory": false},
		{"name": "Drallfrei aufgeschossen", "mandatory": false},
		{"name": "Mit mindestens drei Schlägen quer umwickelt", "mandatory": false},
		{"name": "Schläge eng und fest gewickelt", "mandatory": false},
		{"name": "Überstehendes Leinenende hat mindetens 10x Leinendurchmesser", "mandatory": false},
	]},
	{"name": "3.3 Verbinden zweier Rundhölzer mit einem Kreuzbund (Beginn mit Mastwurf)", "min_tasks": 4, "parts": [
		{"name": "Mit Mastwurf und Halbschlag begonnen", "mandatory": true},
		{"name": "Wechselschlag richtig angesetzt", "mandatory": true},
		{"name": "Mindestens drei Schläge in jede Richtung", "mandatory": true},
		{"name": "Kreuzbund mit Rosette festgezogen", "mandatory": true},
	]},
	{"name": "3.4 Binden eines Mastwurfs an einem Rundholz", "min_tasks": 2, "parts": [
		{"name": "Mastwurf richtig gebunden", "mandatory": true},
		{"name": "Mastwurf durch Halbschlag gesichert", "mandatory": true},
		{"name": "Überhang des freien Leinenendes hat mindestens 10x Leinendurchmesser", "mandatory": false},
	]},
	{"name": "3.5 Binden eines einfachen Ankerstichs an einem Rundholz mit einer Arbeitsleine; die Leine ist mit einem halben Schlag zu sichern", "min_tasks": 2, "parts": [
		{"name": "\"Verloren fest\" um Rundholz gelegt", "mandatory": true},
		{"name": "Ankerstich richtig ausgeführt", "mandatory": true},
	]},
	{"name": "3.6 Binden eines Dreibockbundes", "min_tasks": 5, "parts": [
		{"name": "Stammenden auf gleiche Höhe gelegt", "mandatory": false},
		{"name": "Abstände der Hölzer auf 3/4 des Durchmessers eingehalten", "mandatory": false},
		{"name": "Bund ca. 50cm unterhalb des kürzesten Zopfendes begonnen", "mandatory": false},
		{"name": "Arbeitsleine (lang) für Dreibockbund verwendet", "mandatory": true},
		{"name": "Mindestens 6 Achterschläge ausgeführt", "mandatory": true},
		{"name": "Mastwürfe (mit Halbschlag) liegen unterhalb der Achterschläge", "mandatory": true},
		{"name": "Würgeschlag ist ausgeführt", "mandatory": true},
	]},
	{"name": "3.7 Herstellen eines Bockschnürbunds mit einer Arbeitsleine (kurz)", "min_tasks": 4, "parts": [
		{"name": "Am \"tragenden\" Holz mit Mastwurf begonnen (bei Beginn mit Zopfende zusätzlicher Halbschlag ausgeführt)", "mandatory": true},
		{"name": "Leinenüberhang mindestens 10x Leinendurchmesser", "mandatory": false},
		{"name": "Eng und fest gebunden", "mandatory": true},
		{"name": "Entgegen der Lastrichtung, d.h. nach oben gebunden", "mandatory": true},
		{"name": "Abschluss am waagerechten Holz mit Mastwurf (bei Abschluss mit Zopfende zusätzlichen Halbschlag ausgeführt)", "mandatory": false},
	]},
	{"name": "3.8 Anschlagen einer Anschlagkette an einem liegenden Baum, um ihn wegzuziehen", "min_tasks": 2, "parts": [
		{"name": "Hakensicherung kontrolliert", "mandatory": true},
		{"name": "Kette am Baum fest angezogen", "mandatory": false},
		{"name": "THW-Einsatzhandschuhe getragen", "mandatory": true},
	]},
	{"name": "3.9 Verbinden zweier Kettenenden mit einem Schäkel", "min_tasks": 4, "parts": [
		{"name": "Kettenstränge drallfrei ausgelegt", "mandatory": true},
		{"name": "Kettenenden mit Schäkel verbunden", "mandatory": true},
		{"name": "Schäkelbolzen vollständig eingedreht", "mandatory": true},
		{"name": "Schäkelbolzen gegen Herausdrehen gesichert", "mandatory": false},
		{"name": "THW-Einsatzhandschuhe getragen", "mandatory": true},
	]},
	{"name": "4.1 Zusammenstecken zweier Steckleiterteile", "min_tasks": 3, "parts": [
		{"name": "THW-Einsatzhandschuhe getragen", "mandatory": false},
		{"name": "Leiterteile ineinander geschoben", "mandatory": true},
		{"name": "Vor der Zugprobe geprüft, dass die Federsperrbolzen geschlossen sind", "mandatory": true},
		{"name": "Zugprobe durchgeführt", "mandatory": true},
	]},
	{"name": "4.2 Aufrichten einer Steckleiter, bestehend aus zwei Steckleiterteilen - über Sprosse", "min_tasks": 3, "parts": [
		{"name": "Stationshelfer/in für Fußpunktsicherung oder zur Hilfestellung beim Aufrichten angewiesen", "mandatory": true},
		{"name": "Leiter gesichert über Sprosse aufgerichtet und angelegt", "mandatory": true},
		{"name": "Anstellwinkel überprüft und ggf. korrigiert (65° - 75°)", "mandatory": true},
	]},
	{"name": "4.3 Aufrichten einer Steckleiter, bestehend aus zwei Steckleiterteilen - über Holm", "min_tasks": 3, "parts": [
		{"name": "Leiter seitlich auf einen Holm gelegt", "mandatory": false},
		{"name": "Leiter am Holm bis zur Schulterhöhe angehoben und dann umgegriffen", "mandatory": false},
		{"name": "Leiter gesichert über Holm aufgerichtet und angelegt", "mandatory": true},
		{"name": "Anstellwinkel übrprüft und ggf. korrigiert (65° - 75°)", "mandatory": true},
	]},
	{"name": "4.4 Aufrichten einer Steckleiter, bestehend aus zwei Steckleiterteilen - über Widerlager", "min_tasks": 3, "parts": [
		{"name": "Leiter mit dem Fußende vor das Widerlager gelegt", "mandatory": true},
		{"name": "Leiter über Sprosse gesichert aufgerichtet und angelegt", "mandatory": true},
		{"name": "Anstellwinkel überprüft und ggf. korrigiert (65° - 75°)", "mandatory": true},
	]},
	{"name": "4.5 Herstellen eines Widerlagers (Kanthölzer) zum Aufrichten einer Steckleiter", "min_tasks": 2, "parts": [
		{"name": "Ebenen Untergrund ausgewählt oder hergerichtet", "mandatory": false},
		{"name": "Widerlager richtig (90°) zum Objekt hergestellt", "mandatory": true},
		{"name": "Widerlager richtig befestigt (Bauklammern)", "mandatory": true},
	]},
	{"name": "4.6 Herstellen einer Fußpunktsicherung mit Querriegel und Arbeitsleine", "min_tasks": 3, "parts": [
		{"name": "Die gebundenen Mastwürfe sind mit einem halben Schlag gesichert", "mandatory": false},
		{"name": "Bei beiden Mastwürfen am Holm ist die Sprosse eingebunden", "mandatory": true},
		{"name": "Leine am Querriegel \"verloren fest\"", "mandatory": true},
		{"name": "Beide Seiten der Leine sind gleichmäßig gespannt", "mandatory": true},
	]},
	{"name": "4.7 Herstellen einer Kopfpunktsicherung mit Querriegel und Arbeitsleine", "min_tasks": 4, "parts": [
		{"name": "Arbeitsleine am Querriegel mittels Mastwurf festgelegt", "mandatory": true},
		{"name": "Abgehendes Leinenende um den Holm und über eine Sprosse zum Querriegel zurückgeführt", "mandatory": true},
		{"name": "Leine mit mindestens drei Schlägen um Sprosse und Querriegel geführt", "mandatory": true},
		{"name": "Leine um den zweiten Holm herumgelegt und mit Mastwurf und Halbschlag am Querriegel festgelegt", "mandatory": true},
	]},
	{"name": "4.8 Besteigen einer Steckleiter - mit dynamischer Fußpunktsicherung", "min_tasks": 3, "parts": [
		{"name": "Anstellwinkel geprüft und ggf. korrigiert (65°-75°)", "mandatory": true},
		{"name": "Stationshelfer/in zur Leitersicherung herangezogen", "mandatory": true},
		{"name": "An Sprossen festgehalten (nicht am Holm)", "mandatory": true},
	]},
	{"name": "5.1 Aufbau einer mobilen Stromversorgung mit Beleuchtung", "min_tasks": 9, "parts": [
		{"name": "Stativbeine maximal gespreizt, senkrecht/lotrecht ausgerichtet und Flügelschrauben angezogen", "mandatory": true},
		{"name": "Flutlichtleuchte aufgesteckt, ausgerichtet und gesichert", "mandatory": true},
		{"name": "Teleskoprohre (mit Stationshelfer/in) auf maximale Höhe herausgezogen und gesichert", "mandatory": true},
		{"name": "Beim Herausziehen der Teleskoprohre THW-Einsatzhandschuhe getragen", "mandatory": true},
		{"name": "Stativ ordnungsgemäß (dreiseitig und einheitlich) abgespannt", "mandatory": true},
		{"name": "Abspannseile mit Absperrband (Flatterband) gekennzeichnet", "mandatory": false},
		{"name": "Leitung auf Beschädigung geprüft", "mandatory": false},
		{"name": "Leitung vollständig abgerollt", "mandatory": true},
		{"name": "Überschüssige Leitung in großen Buchten stolperfrei verlegt", "mandatory": true},
		{"name": "Schutzdeckel und Schutzkappen verbunden", "mandatory": false},
		{"name": "Vom Verbraucher zum Erzeuger aufgebaut", "mandatory": false},
	]},
	{"name": "5.2 Inbetriebnahme eines tragbaren Stromerzeugers", "min_tasks": 7, "parts": [
		{"name": "Abgasschlauch angeschlossen", "mandatory": true},
		{"name": "Kraftstofffüllstand geprüft", "mandatory": false},
		{"name": "Ölstand überprüft", "mandatory": false},
		{"name": "Chokezug herausgezogen (bei warmen Motor nur erklären)", "mandatory": true},
		{"name": "Kraftstoffhahn geöffnet", "mandatory": true},
		{"name": "Verbraucher erst angeschlossen, wenn der Motor mit Nenndrehzahl läuft", "mandatory": true},
		{"name": "Überwurfringglocke der Anschlussleitung an der Steckdose des tragbaren Stromerzeugers verriegelt", "mandatory": false},
		{"name": "Die Reihenfolge der Bedienschritte ist eingehalten. (Ausnahme: Reihenfolge der Überprüfung Kraftstoff und Ölstand)", "mandatory": true},
	]},
	{"name": "6.1.1 Zeigen von Werkzeugen für die Holzbearbeitung", "min_tasks": 6, "parts": [
		{"name": "Bügelsäge", "mandatory": false},
		{"name": "Fuchsschwanz", "mandatory": false},
		{"name": "Stichsäge", "mandatory": false},
		{"name": "Lochbeitel", "mandatory": false},
		{"name": "Handbeil", "mandatory": false},
		{"name": "Holzaxt", "mandatory": false},
		{"name": "Kistenbeitel", "mandatory": false},
		{"name": "Zugmesser", "mandatory": false},
	]},
	{"name": "6.1.2 Benennen von Werkzeugen für die Holzbearbeitung", "min_tasks": 7, "parts": [
		{"name": "Zugmesser", "mandatory": false},
		{"name": "Lochbeitel", "mandatory": false},
		{"name": "Schreinerklüpfel", "mandatory": false},
		{"name": "Halbrund-Raspel", "mandatory": false},
		{"name": "Bohrsäge (Stichling)", "mandatory": false},
		{"name": "Stangen-Schlangenbohrer", "mandatory": false},
		{"name": "Latthammer", "mandatory": false},
		{"name": "Fuchsschwanz", "mandatory": false},
		{"name": "Schlegel", "mandatory": false},
	]},
	{"name": "6.1.3 Zeigen von Mess- und Anreißwerkzeugen für die Holzbearbeitung", "min_tasks": 4, "parts": [
		{"name": "Gliedermaßstab (Zollstock)", "mandatory": false},
		{"name": "Zimmermannswinkel", "mandatory": false},
		{"name": "Bandmaß", "mandatory": false},
		{"name": "Stellwinkel (Schmiege)", "mandatory": false},
		{"name": "Wasserwaage", "mandatory": false},
	]},
	{"name": "6.1.4 Rechwinkliges Ablängen eines Kantholzes mit der Bügelsäge", "min_tasks": 3, "parts": [
		{"name": "THW-Einsatzhandschuhe getragen", "mandatory": true},
		{"name": "Für den Anschnitt Führungsholz verwendet", "mandatory": true},
		{"name": "Sägeblattlänge voll ausgenutzt", "mandatory": false},
		{"name": "Sägeschnitt gerade und rechtwinklig (Sichtkontrolle von Helfer/in durchgeführt)", "mandatory": false},
	]},
	{"name": "6.1.5 Herstellen einer rechtwinkligen Holzverbindung mittels Lochblech", "min_tasks": 3, "parts": [
		{"name": "Kamm-/Ankernägel ausgewählt", "mandatory": true},
		{"name": "Beide Lochbleche mittig angesetzt", "mandatory": true},
		{"name": "mind. 4 Nägel fachgerecht gesetzt und eingeschlagen und weitere Ausführung mündlich erklärt", "mandatory": true},
	]},
	{"name": "6.1.6 Einfaches Kreuzen zweier Kanthölzer durch Verbinden mittels Gewindestange", "min_tasks": 4, "parts": [
		{"name": "Löcher mittig angerissen", "mandatory": true},
		{"name": "Löcher rechtwinklig gebohrt", "mandatory": true},
		{"name": "Kanthölzer mit Gewindestange verbunden", "mandatory": true},
		{"name": "Unterlegscheiben (quadratisch) verwendet", "mandatory": true},
		{"name": "Sechskantmuttern festgezogen", "mandatory": false},
	]},
	{"name": "6.2.1 Inbetriebnahme des Bohr- und Aufbrechhammers und Bohren eines Lochs in Senkrechter Richtung", "min_tasks": 4, "parts": [
		{"name": "Bohr- und Aufbrechhammer auf \"Bohren\" gestellt", "mandatory": true},
		{"name": "Bohrer eingesetzt und arretiert", "mandatory": true},
		{"name": "Bohr- und Aufbrechhammer erst am Objekt angesetzt und dann in Betrieb genommen", "mandatory": true},
		{"name": "Schutzbrille/Visier und Kapselgehörschutz ordnungsgemäß getragen", "mandatory": true},
		{"name": "Nutzung/nicht Nutzung von THW-Einsatzhandschuhen mündlich erläutert", "mandatory": false},
	]},
	{"name": "6.2.2 Inbetriebnahme des Bohr- und Aufbrechhammers und Arbeiten mit dem Spitzmeißel in senkrechter Richtung", "min_tasks": 5, "parts": [
		{"name": "Bohr- und Aufbrechhammer auf \"Schlagen\" gestellt", "mandatory": true},
		{"name": "Spitzmeißel eingesetzt und arretiert", "mandatory": true},
		{"name": "Bohr- und Aufbrechhammer erst am Objekt angesetzt und dann in Betrieb genommen", "mandatory": true},
		{"name": "Schutzbrille/Visier und Kapselgehörschutz ordnungsgemäß getragen", "mandatory": true},
		{"name": "THW-Einsatzhandschuhe getragen", "mandatory": true},
	]},
	{"name": "6.2.3 In- und Außerbetriebnahme eines Trennschleifers (mit Verbrennungsmotor) sowie Ablängen eines Ton- Steinzeug- oder Betonrohres", "min_tasks": 9, "parts": [
		{"name": "Geeignete Trennscheibe benutzt", "mandatory": true},
		{"name": "Druckscheibe richtig eingesetzt", "mandatory": true},
		{"name": "Trennscheibe zentriert und angezogen", "mandatory": true},
		{"name": "Für Startvorgang muss das Gerät sicher auf dem Boden stehen", "mandatory": true},
		{"name": "Auf sicheren Stand geachtet und Gerät seitlich am Körper vorbei geführt", "mandatory": true},
		{"name": "Schleif-/Trennscheibenschutz richtig eingestellt (Werkstoffpartikel werden vom/von der Benutzer/in und Gerät weggelenkt", "mandatory": true},
		{"name": "Mit Höchstdrehzahl am Werkstück angesetzt", "mandatory": true},
		{"name": "Vor Ablegen des Trennschleifers Stillstand der Scheibe abgewartet", "mandatory": true},
		{"name": "Schutzausstattung zzgl. Staubschutzmaske getragen", "mandatory": true},
	]},
	{"name": "6.3.1 Ablängen einer Gewindestange mit der Metallbügelsäge", "min_tasks": 4, "parts": [
		{"name": "Gewindestange mit Gewindeschutz im Schraubstock eingespannt", "mandatory": true},
		{"name": "Gewindestange auf Maß abgelängt", "mandatory": true},
		{"name": "Schnitt rechtwinklig ausgeführt (Sichtkontrolle)", "mandatory": false},
		{"name": "Schnittfläche geebnet und entgratet", "mandatory": true},
		{"name": "Auf Gewindegängigkeit geprüft", "mandatory": true},
	]},
	{"name": "6.3.2 Ablängen eines Rohrstückes mit der Metallbügelsäge", "min_tasks": 4, "parts": [
		{"name": "Sägeblatt so in den Sägebügel eingesetzt, dass die Stoßzähnung vom Griff weg weist", "mandatory": true},
		{"name": "Sägeblatt gespannt (Flügelmutter von Hand festgezogen)", "mandatory": true},
		{"name": "Sägeblatt während des Sägens nicht verkantet", "mandatory": false},
		{"name": "Sägeblatt auf ganzer Länge genutzt", "mandatory": false},
		{"name": "Schnitt nahe der Spannbacken dess Schraubstocks durchgeführt", "mandatory": true},
		{"name": "Schnitt rechtwinklig zur Rohrachse ausgeführt (Sichtkontrolle)", "mandatory": false},
	]},
	{"name": "6.3.3 Inbetriebnahme der Säbelsäge und Ablängen eines Rohrstückes", "min_tasks": 5, "parts": [
		{"name": "THW-Einsatzhandschuhe, Kapselgehörschutz und Schutzbrille getragen", "mandatory": true},
		{"name": "Stromverbindung erst nach Montage hergestellt", "mandatory": true},
		{"name": "Metallsägeblatt verwendet", "mandatory": true},
		{"name": "Schnitt rechtwinklig zur Rohrachse durchgeführt (Sichtkontrolle)", "mandatory": false},
		{"name": "Sägeblatt nicht verkantet", "mandatory": true},
		{"name": "Leitungsführung beachtet", "mandatory": true},
	]},
	{"name": "6.3.4 In- und Außerbetriebnahme eines Trennschleifers (mit Elektromotor) sowie Durchtrennen eines Metallrohres", "min_tasks": 8, "parts": [
		{"name": "Geeignete Trennscheibe benutzt", "mandatory": true},
		{"name": "Stromverbindung erst nach Montage hergestellt", "mandatory": true},
		{"name": "Auf sicheren Stand geachtet und Maschine seitlich am Körper vorbei geführt", "mandatory": true},
		{"name": "Schleif-/Trennscheibenschutz richtig eingestellt (Werkstoffpartikel werden vom/von der Benutzer/in und Gerät weggelenkt", "mandatory": true},
		{"name": "Flansch richtig eingesetzt", "mandatory": true},
		{"name": "Trennscheibe zentriert und angezogen", "mandatory": true},
		{"name": "Mit Höchstdrehzahl am Werkstück angesetzt", "mandatory": true},
		{"name": "Vor Ablegen des Trennschleifers Stillstand der Scheibe abgewartet", "mandatory": true},
	]},
	{"name": "6.3.5 Gebrauch der Schutzausstattung beim Betrieb eines Trennschleifers", "min_tasks": 5, "parts": [
		{"name": "Schutzbrille und Kapselgehörschutz getragen", "mandatory": true},
		{"name": "Lederschutzhandschuhe getragen", "mandatory": true},
		{"name": "Lederschürze angelegt", "mandatory": true},
		{"name": "Jacke komplett geschlossen", "mandatory": true},
		{"name": "Hose über Stiefel getragen", "mandatory": true},
	]},
	{"name": "6.3.6 Arbeitsschutzmaßnahmen bei Arbeiten mit dem Trennschleifer anwenden", "min_tasks": 3, "parts": [
		{"name": "Kein Aufenthalt von Personen im Bereich des Funkenfluges", "mandatory": true},
		{"name": "Löschmittel bereitgestellt", "mandatory": true},
		{"name": "Keine brennbaren Gegenstände im Bereich des Funkenfluges", "mandatory": true},
	]},
	{"name": "7.1 Einseitiges Anheben einer Last mit der Brechstange und Unterbauen der Last", "min_tasks": 4, "parts": [
		{"name": "Brechstange beim Anheben nicht abgerutscht", "mandatory": true},
		{"name": "Auflagefläche unter dem Hebeldrehpunkt aus bruchsicherem Material", "mandatory": true},
		{"name": "Last nach dem Anheben unterbaut", "mandatory": true},
		{"name": "Nicht unter die angehobene Last gegriffen", "mandatory": true},
	]},
	{"name": "7.2 Anheben einer Last mit Zahnstangenwinde/hydraulischem Heber und Unterbauen der Last", "min_tasks": 6, "parts": [
		{"name": "Last gegen Verschieben gesichert", "mandatory": true},
		{"name": "Anhebeklaue rechtwinklig zur Last angesetzt", "mandatory": true},
		{"name": "Fußplatte vollflächig auf bruchsicheren/druckfesten Untergrund aufgesetzt", "mandatory": true},
		{"name": "Anhebeklaue vollflächig unter der Last angesetzt", "mandatory": true},
		{"name": "Last nach Anheben unterbaut", "mandatory": true},
		{"name": "Nicht unter die angehobene Last gegriffen", "mandatoy": true},
	]},
	{"name": "7.3 Vorbereiten des Hebe-/Pressgeräts, hydraulisch", "min_tasks": 4, "parts": [
		{"name": "Höchstdruckschlauch drall- und knickfrei ausgelegt", "mandatory": true},
		{"name": "Kupplungen auf Sauberkeit überprüft und bei Bedarf gereinigt", "mandatory": true},
		{"name": "Verschlüsse und Verschlusskappen zusammengesteckt/verschraubt", "mandatory": false},
		{"name": "Fußplatte angeschraubt/eingesetzt", "mandatory": true},
		{"name": "Geeignetes Kopfstück verwendet", "mandatory": true},
	]},
	{"name": "7.4 Anheben einer Last mit Hebe-/Pressgerät, hydraulisch, Erklären des Schnellstopps und Ablassen der Last", "min_tasks": 5, "parts": [
		{"name": "Pressenkörper rechtwinklig zur Last angesetzt", "mandatory": true},
		{"name": "Last gegen Verschieben gesichert", "mandatory": true},
		{"name": "Funktion des \"Schnellstopps\" erklärt", "mandatory": true},
		{"name": "Last angehoben und mit Keilen und Unterleghölzern gesichert", "mandatory": true},
		{"name": "Last sicher abgelassen", "mandatory": true},
	]},
	{"name": "7.5 Inbetriebnahme eines Zuggeräts und Ziehen einer Last im direkten Zug", "min_tasks": 8, "parts": [
		{"name": "THW-Einsatzhandschuhe getragen", "mandatory": true},
		{"name": "Zuggerät an geeignetem Festpunkt angeschlagen", "mandatory": true},
		{"name": "Schaltgriff zurückgezogen und eingerastet", "mandatory": false},
		{"name": "Rückzughebel bis zum Anschlag nach hinten gedrückt", "mandatory": false},
		{"name": "Drahtzugseil am Mundstück eingeführt und durchgeschoben", "mandatory": true},
		{"name": "Schaltgriff gelöst", "mandatory": false},
		{"name": "Sicherheitsabstände eingehalten (keine Personen im Gefahrenbereich)", "mandatory": true},
		{"name": "Anschlagverbindungen des Zuggeräts bzw. des Drahtzugseils gesichert", "mandatory": true},
		{"name": "Hebelrohr ausgezogen und gesichert", "mandatory": true},
		{"name": "Hebelrohr auf Vorschubhebel gesteckt und gesichert", "mandatory": false},
	]},
	{"name": "7.6 Außerbetriebnahme des Zuggeräts", "min_tasks": 4, "parts": [
		{"name": "Drahtzugseil entspannt", "mandatory": true},
		{"name": "Rückzughebel betätigt", "mandatory": true},
		{"name": "Drahtzugseil- und Zughaken von den Verankerungen gelöst", "mandatory": false},
		{"name": "Schaltgriff zurückgezogen und eingerastet", "mandatory": true},
		{"name": "Drahtzugseil herausgezogen", "mandatory": false},
		{"name": "Schaltgriff gelöst", "mandatory": false},
	]},
	{"name": "7.7 Einsatzbereitschaft des Hebekissensatzes mit zwei Hebekissen herstellen", "min_tasks": 8, "parts": [
		{"name": "Gesichtsschutz mit Voll-Visier getragen", "mandatory": true},
		{"name": "Absperrhahn des Druckminderers geschlossen", "mandatory": true},
		{"name": "Druckminderer an der Druckluftflasche angeschlossen", "mandatory": true},
		{"name": "Flaschenventil geöffnet", "mandatory": false},
		{"name": "Hinterdruck mit Regulierknebel eingestellt", "mandatory": true},
		{"name": "Schlauch des Druckminderers am Doppelsteuerorgan angeschlossen", "mandatory": false},
		{"name": "Kupplungen auf Sauberkeit geprüft und bei Bedarf gereinigt", "mandatory": true},
		{"name": "Kupplungen und Nippel soweit zusammengdrückt bis der Kupplungsring sichtbar einrastet", "mandatory": false},
		{"name": "Füllschläuche an Kissen und Doppelsteuerorgan seitenrichtig angeschlossen", "mandatory": true},
	]},
	{"name": "7.8 Einseitiges Anheben einer Last mit einem Hebekissen um min. 10 cm und Ablassen der Last", "min_tasks": 7, "parts": [
		{"name": "Hebekissen gemäß den Herstellervorgaben unter die Last geschoben", "mandatory": true},
		{"name": "Gesichtsschutz mit Voll-Visier getragen", "mandatory": true},
		{"name": "Kissen unter der Last befüllt", "mandatory": false},
		{"name": "Last durch Keile und Unterleghölzer gesichert", "mandatory": true},
		{"name": "Nicht unter die Last gegriffen", "mandatory": true},
		{"name": "Kissen nicht ruckartig befüllt", "mandatory": true},
		{"name": "Last langsam abgelassen", "mandatory": false},
		{"name": "Kissen vor scharfen Kanten/spitzen Gegenständen geschützt", "mandatory": true},
	]},
	{"name": "8.1 Füllen und Verlegen von Sandsägen (zugebunden)", "min_tasks": 3, "parts": [
		{"name": "Sandsack ca. 2/3 (max 12kg) mit Sand gefüllt und zugebunden", "mandatory": true},
		{"name": "Sandsäcke flach auf den Boden gelegt", "mandatory": false},
		{"name": "Einfüllöffnung zeigt landwärts", "mandatory": false},
		{"name": "Sandsäcke zum dichten Verbund gelegt", "mandatory": false},
	]},
	{"name": "8.2 Inbetriebnahme einer Tauchpumpe und Verwendung eines Strahlrohres", "min_tasks": 6, "parts": [
		{"name": "Tauchpumpe mit Arbeitsleine durch einfachen Ankerstich gesichert", "mandatory": true},
		{"name": "Druckschlauch fest angekuppelt", "mandatory": false},
		{"name": "Elektrische Verbindung hergestellt", "mandatory": true},
		{"name": "Strahlrohr am Druckschlauch fest angekuppelt", "mandatory": true},
		{"name": "Pumpe an der Arbeitsleine in das Wasser gelassen", "mandatory": true},
		{"name": "Strahlrohr durch Stationshelfer/in gesichert und Sprühstahl eingestellt", "mandatory": true},
		{"name": "Druckschlauch nicht über scharfe Kanten gezogen", "mandatory": false},
	]},
	{"name": "8.3 Inbetriebnahme einer Tauchpumpe", "min_tasks": 4, "parts": [
		{"name": "Tauchpumpe mit Arbeitsleine durch einfachen Ankerstich gesichert", "mandatory": true},
		{"name": "Druckschlauch angekuppelt und Ende festgelegt mit einer Schlauchbrücke bei freiem Auslauf", "mandatory": true},
		{"name": "Elektrische Verbindung hergestellt und Pumpe eingeschaltet", "mandatory": true},
		{"name": "Pumpe an der Arbeitsleine in das Wasser gelassen", "mandatory": true},
	]},
	{"name": "8.4 Verlegen von Druckschläuchen über einen Verkehrsweg", "min_tasks": 3, "parts": [
		{"name": "Druckschläuche drall- und knickfrei verlegt", "mandatory": true},
		{"name": "Schluchbrücken verwendet", "mandatory": true},
		{"name": "Straßenquerung mit Verkehrsleitkegel gesichert", "mandatory": true},
		{"name": "Stationshelfer/in als Sicherungsposten eingeteilt", "mandatory": false},
	]},
	{"name": "8.5 Anlegen und Erklären der THW-Rettungsweste", "min_tasks": 3, "parts": [
		{"name": "Auf oberflächliche Beschädigungen überprüft", "mandatory": false},
		{"name": "Aufblasvorrichtung kontrolliert", "mandatory": true},
		{"name": "Handauslöseleine nach außen geführt", "mandatory": true},
		{"name": "THW-Rettungsweste korrekt angelegt und geschlossen", "mandatory": true},
	]},
	{"name": "9.1 Absicherung einer Einsatzstelle im öffentlichen Verkehrsraum zur Eigensicherung", "min_tasks": 5, "parts": [
		{"name": "Angemessenen Abstand zur Schadenstelle eingehalten", "mandatory": true},
		{"name": "Warnweste angelegt und verschlossen", "mandatory": true},
		{"name": "Den Verkehrsweg nicht unnötig überquert", "mandatory": true},
		{"name": "Verkehrsleitkegel mit Warnblitzleuchten, für den Verkehr abweisend entlang der Straße, aufgestellt und eingeschaltet", "mandatory": true},
		{"name": "Warnschilder aufgestellt", "mandatory": true},
		{"name": "Meldung an den/die direkte/n Vorgesetzte/n abgegeben", "mandatory": false},
	]},
	{"name": "9.2 Absetzen einer Meldung an eine/n Vorgesetzten", "min_tasks": 3, "parts": [
		{"name": "Richtige/n Ansprechpartner/in ausgewählt", "mandatory": true},
		{"name": "Einsatzsituation mit zutreffenden Stichworten wiedergegeben", "mandatory": true},
		{"name": "Meldung kurz und verständlich formuliert", "mandatory": true},
		{"name": "Der/die Empfänger/in der Meldung wird direkt und persönlich angesprochen", "mandatory": false},
	]},
	{"name": "10.1 Transportsicherung auf einer Krankentrage für den Transport auf unebenem Gelände", "min_tasks": 7, "parts": [
		{"name": "Arbeitsleinen mit Doppelstich verbunden", "mandatory": true},
		{"name": "Leinenführung nach Vorgabe fest am Körper", "mandatory": true},
		{"name": "Person in der Einbindungszeit betreut, Handgriffe erklärt und angesprochen", "mandatory": true},
		{"name": "Hüft- und Brustgurt geschlossen", "mandatory": true},
		{"name": "Arbeitsleine kopfseitig mit Mastwurf und Halbschlag am Tragegriff und mit Halbschlag am Tragebein gesichert (beidseitig)", "mandatory": true},
		{"name": "Achterschlag an den Füßen korrekt ausgeführt", "mandatory": true},
		{"name": "Arbeitsleine fußseitig jeweils mit Halbschlag am Tragegriff und am Tragebein gesichert (beidseitig)", "mandatory": true},
	]},
	{"name": "10.2 Zuordnung von Löschmitteln", "min_tasks": 4, "parts": [
		{"name": "Elektroanlagen - Kohlendioxidlöscher", "mandatory": true},
		{"name": "Holz - Wasser", "mandatory": true},
		{"name": "Metallspäne - Sand", "mandatory": true},
		{"name": "Kraftstoffe - ABC-Löschpulver", "mandatory": true},
	]},
	{"name": "10.3 Einsatzbereitschaft des hydraulischen Rettungssatzes herstellen", "min_tasks": 5, "parts": [
		{"name": "Höchstdruckschlauch 5m gelb am Antriebsaggregat/Umschaltventil verwendet", "mandatory": true},
		{"name": "Externes Umschaltventil in Mittelstellung gebracht", "mandatory": true},
		{"name": "Höchstdruckschlauch 10m gelb am Umschaltventil bzw. Aggregat/Spreizer verwendet", "mandatory": false},
		{"name": "Höchstdruckschlauch 10m rot am Umschaltventil bzw. Aggregat/Schere verwendet", "mandatory": false},
		{"name": "Höchstdruckschläuche drall- und knickfrei ausgelegt", "mandatory": true},
		{"name": "Kupplungen auf Sauberkeit überprüft und bei Bedarf gereinigt", "mandatory": true},
		{"name": "Kupplungen und Verschlüsse zusammengesteckt", "mandatory": false},
	]},
	{"name": "10.4 Gebrauch der Schutzausstattung beim Betrieb des hydraulischen Rettungssatzes", "min_tasks": 3, "parts": [
		{"name": "Helm mit geschlossenem Visier getragen", "mandatory": true},
		{"name": "Lederschutzhandschuhe getragen", "mandatory": true},
		{"name": "Jacke komplett geschlossen", "mandatory": true},
	]},
	{"name": "10.5 Ablängen eines Metallrohres mit der hydraulischen Schere", "min_tasks": 5, "parts": [
		{"name": "Stationshelfer/in am Umschaltventil positioniert", "mandatory": false},
		{"name": "Handventil geschlossen", "mandatory": true},
		{"name": "Motor gestartet", "mandatory": true},
		{"name": "Auf sicheren Stand geachtet", "mandatory": false},
		{"name": "Ablängen eines Metallrohres mit Schere", "mandatory": true},
		{"name": "Scherenmesser leicht überlappend geschlossen", "mandatory": true},
	]},
	{"name": "10.6 Spreizen zweier Metallstäbe mit dem hydraulischen Spreizer", "min_tasks": 5, "parts": [
		{"name": "Handventil geschlossen", "mandatory": true},
		{"name": "Motor gestartet", "mandatory": true},
		{"name": "Stationshelfer/in am Umschaltventil positioniert", "mandatory": false},
		{"name": "Auf sicheren Stand geachtet", "mandatory": false},
		{"name": "Metallstäbe gespreizt", "mandatory": false},
		{"name": "Spreizer nicht komplett geschlossen", "mandatory": true},
	]},
	{"name": "10.7 Anlegen der persönlichen Schutzusstattung gegen Absturz (PSAgA)", "min_tasks": 7, "parts": [
		{"name": "Keine Gegenstände in den Taschen des Multifunktionalen Einsatzanzuges (MEA)", "mandatory": true},
		{"name": "Sichtprüfung durchgeführt, um mögliche Verunreinigungen, Beschädigungen oder Risse feststellen zu können", "mandatory": true},
		{"name": "Auffanggurt an der Rückenöse aufgenommen", "mandatory": false},
		{"name": "Auffanggurt mit Hilfe des Stationshelfers/der Stationshelferin wie eine Jacke angelegt", "mandatory": false},
		{"name": "Beide Beinriemen geschlossen", "mandatory": true},
		{"name": "Brustgurt geschlossen", "mandatory": true},
		{"name": "Hüftgurt geschlossen", "mandatory": true},
		{"name": "Kontrolle durch Stationshelfer/in durchgeführt", "mandatory": true},
		{"name": "Sitzprobe mit Unterstützung des Stationshelfers/der Stationshelferin durchgeführt", "mandatory": true},
	]},
];

function render() {
	var examineesWaiting = Object.keys(data.examinees);

	for (var a_id of Object.keys(data.assignments)) {
		const assignment = data.assignments[a_id];
		if (assignment.result == "open") {
			var _i = examineesWaiting.indexOf(assignment.examinee);
			if (_i >= 0) {
				examineesWaiting.splice(_i, 1);
			}
		}
	}

	var examineesWaitingReturnTime = Object.fromEntries(examineesWaiting.map((e_id) => [e_id, 0]));
	var examineesWaitingMissingStations = Object.fromEntries(examineesWaiting.map((e_id) => [e_id, Object.keys(data.stations)]));
	for (var assignment of Object.values(data.assignments)) {
		if (assignment.end !== null) {
			examineesWaitingReturnTime[assignment.examinee] = Math.max(examineesWaitingReturnTime[assignment.examinee], assignment.end);
		}
		if (assignment.result == "done" && assignment.examinee in examineesWaitingMissingStations) {
			var _i = examineesWaitingMissingStations[assignment.examinee].indexOf(assignment.station);
			if (_i >= 0) {
				examineesWaitingMissingStations[assignment.examinee].splice(_i, 1);
			}
		}
	}
	examineesWaiting.sort(function (a, b) {
		// Make sure completed users are listed down below
		if (examineesWaitingMissingStations[a].length != examineesWaitingMissingStations[b].length) {
			if (examineesWaitingMissingStations[a] == 0) {
				return 1;
			}
			if (examineesWaitingMissingStations[b] == 0) {
				return -1;
			}
		}
		if (examineesWaitingReturnTime[a] != examineesWaitingReturnTime[b]) {
			return examineesWaitingReturnTime[a] - examineesWaitingReturnTime[b];
		}
		if (data.examinees[a].name < data.examinees[b].name) {
			return -1;
		}
		if (data.examinees[a].name > data.examinees[b].name) {
			return 1;
		}
		return 0;
	});
	var examineesCompleted = Object.values(examineesWaitingMissingStations).filter((_stations) => _stations.length == 0).length;
	$("#examinees").empty().append(
		$("<li>").addClass("list-group-item").append(
			$("<div>").addClass(["progress"]).append(Object.keys(data.examinees).length == 0 ? [
				$("<div>").addClass(["progress-bar", "bg-danger"]).css("width", "100%").text(""),
			] : [
				$("<div>").addClass(["progress-bar", "bg-success"]).css("width", (examineesCompleted / Object.keys(data.examinees).length) * 100 + "%").text(examineesCompleted),
				$("<div>").addClass(["progress-bar", "bg-danger"]).css("width", ((Object.keys(data.examinees).length - examineesCompleted) / Object.keys(data.examinees).length) * 100 + "%").text(Object.keys(data.examinees).length - examineesCompleted),
			])
		)
	).append(examineesWaiting.map(function (e_id) {
		return _buildExamineeItem(e_id, null).toggleClass("text-muted", examineesWaitingMissingStations[e_id].length == 0);
	}));

	var station_ids = Object.keys(data.stations);
	station_ids.sort(function (a, b) {
		let _a = data.stations[a].name.toLowerCase();
		let _b = data.stations[b].name.toLowerCase();
		if (_a < _b) {return -1;}
		if (_a > _b) {return 1;}
		return 0;
	});
	$("#stations").empty().append(station_ids.map(function (s_id) {
		return _generateStation(s_id, data.stations[s_id].name);
	}));

	$("#pause-container").empty().append(_generateStation(null, "Pause"));
}

function _buildExamineeItem(e_id, a_id) {
	var node = $("<li>").addClass(["list-group-item", "examinee-" + e_id, "text-truncate"]).append(data.examinees[e_id].name).append("flags" in data.examinees[e_id] ? data.examinees[e_id].flags.map((color) => $("<span>").css("color", color).append([" ", circle.clone()])) : []).click(function () {
		if (a_id !== null) {
			_openAssignmentModal(a_id);
		} else {
			_openExamineeModal(e_id);
		}
	});

	var expectedTimeout = null;
	if (a_id !== null) {
		if (data.assignments[a_id].end !== null) {
			expectedTimeout = data.assignments[a_id].end;
		} else {
			var expectedDuration = Examinee.estimateStationDuration(data.assignments[a_id].examinee, data.assignments[a_id].station);
			if (expectedDuration !== null) {
				expectedTimeout = data.assignments[a_id].start + expectedDuration;
			}
		}

		if (expectedTimeout === null) {
			node.addClass("text-warning");
		} else {
			node.addClass("best-before").toggleClass(["text-danger"], Date.now() / 1000 > expectedTimeout).data("best-before", expectedTimeout);
		}
	}

	return node;
}

function _openExamineeModal(e_id) {
	const examinee = data.examinees[e_id];
	var modal = Modal("Prüfling " + examinee.name);

	var stationTimes = Object.fromEntries(Object.keys(data.stations).map((s_id) => [s_id, {"sum": 0, "count": 0}]));
	var assignments = [];
	var missingStations = Object.keys(data.stations);
	var currentAssignment = null;
	var firstStart = null;
	for (const a_id of Object.keys(data.assignments)) {
		const assignment = data.assignments[a_id];
		if (firstStart === null || assignment.start < firstStart) {
			firstStart = assignment.start;
		}

		if (assignment.result == "done" && assignment.station !== null) {
			stationTimes[assignment.station].sum += assignment.end - assignment.start;
			stationTimes[assignment.station].count += 1;
		}

		if (assignment.examinee == e_id) {
			if (assignment.result == "done") {
				var _i = missingStations.indexOf(assignment.station);
				if (_i >= 0) {
					missingStations.splice(_i, 1);
				}
			}
			if (assignment.result == "open") {
				currentAssignment = assignment;
			}
			assignments.push({"i": a_id, ...assignment});
		}
	}
	assignments.sort(function (a, b) {
		return a.start - b.start;
	});
	stationTimes = Object.fromEntries(Object.entries(stationTimes).map(([s_id, _times]) => [s_id, (_times.count > 0 ? _times.sum / _times.count : null)]));

	var currentAssignmentText;
	if (currentAssignment === null) {
		currentAssignmentText = "Der*die Prüfling befindet sich im Bereitstellungsraum.";
	} else if (currentAssignment.station === null) {
		currentAssignmentText = "Der*die Prüfling befindet sich bis " + formatTimestamp(currentAssignment.end) + " in Pause";
	} else {
		currentAssignmentText = "Der*die Prüfling befindet sich seit " + formatTimestamp(currentAssignment.start) + " an Station " + data.stations[currentAssignment.station].name;
	}

	var now = firstStart;
	var assignmentBody = $("<tbody>");
	var sums = {"waiting": 0, "station": 0};
	for (const assignment of assignments) {
		var name = assignment.station === null ? "Pause" : data.stations[assignment.station].name;
		if (assignment.result === "canceled") {
			name = name + " (Abgebrochen)";
		}
		var duration = (assignment.end || Date.now() / 1000) - assignment.start;
		var usage = stationTimes[assignment.station] === null ? 1.0 : duration / stationTimes[assignment.station];
		var durationContent = [$("<span>").text(Math.round(duration / 60))];
		if (assignment.result === "done" && assignment.station !== null) {
			durationContent.push($("<br>"));
			durationContent.push($("<span>").toggleClass("text-danger", usage > 1).toggleClass("text-success", usage < 1).text((usage >= 1 ? "+" : "") + Math.round((usage - 1) * 100) + " %"));
		}
		var oldNow = now;
		now = assignment.end;
		if (assignment.result === "open" && assignment.end !== null) {
			durationContent.push($("<br>"));
			durationContent.push($("<span>").addClass("fst-italic").text("noch " + Math.round((now - Date.now() / 1000) / 60) + " verbleibend"));
			now = null;
		}
		assignmentBody.append($("<tr>").append([
			$("<td>").toggleClass("fst-italic", assignment.station === null || assignment.result == "canceled").append(
				$("<a>").attr("href", "#").text(name).click(function (e) {
					e.preventDefault();
					_openAssignmentModal(assignment.i);
				}),
			),
			$("<td>").addClass("text-end").text(Math.round((assignment.start - oldNow) / 60)),
			$("<td>").addClass("text-end").append(durationContent),
		]));
		sums.waiting += (assignment.start - oldNow);
		sums.station += duration;
	}
	if (now !== null) {
		assignmentBody.append($("<tr>").append([
			$("<td>").addClass("fst-italic").text(" "),
			$("<td>").addClass("text-end").text(Math.round((Date.now() / 1000 - now) / 60)),
			$("<td>").addClass("text-end").text(" "),
		]));
		sums.waiting += (Date.now() / 1000 - now);
	}

	modal.elem.find(".modal-body").append([
		$("<p>").text(currentAssignmentText),
		$("<h5>").text("Offene Stationen"),
		$("<table>").addClass(["table", "table-striped"]).append([
			$("<thead>").append(
				$("<tr>").append([
					$("<th>").text("Station"),
					$("<th>").addClass("text-end").text("⌀ Dauer [min]"),
				])
			),
			$("<tbody>").append(
				missingStations.map(function (s_id) {
					return $("<tr>").append([
						$("<td>").append($("<a>").attr("href", "#").text(data.stations[s_id].name).click(function (e) {
							e.preventDefault();
							_openStationModal(s_id);
						})),
						$("<td>").addClass("text-end").text(stationTimes[s_id] === null ? "unbekannt" : Math.round(stationTimes[s_id] / 60)),
					]);
				})
			),
			$("<tfoot>").append([
				$("<tr>").append([
					$("<th>").text("Gesamt"),
					$("<th>").addClass("text-end").text(Math.round(missingStations.reduce((sum, s_id) => sum + (stationTimes[s_id] === null ? 0 : stationTimes[s_id]), 0) / 60))
				]),
				$("<tr>").append([
					$("<th>").text("Schätzung für Prüfling"),
					$("<th>").addClass("text-end").text(Math.round(Examinee.calculateRemainingTime(e_id) / 60))
				]),
			]),
		]),
		$("<h5>").text("Historie"),
		$("<table>").addClass(["table", "table-striped"]).append([
			$("<thead>").append(
				$("<tr>").append([
					$("<th>").text("Station"),
					$("<th>").addClass("text-end").text("Wartezeit [min]"),
					$("<th>").addClass("text-end").text("Dauer [min]"),
				])
			),
			assignmentBody,
			$("<tfoot>").append(
				$("<tr>").append([
					$("<th>").text("Summe"),
					$("<td>").addClass("text-end").text(Math.round(sums.waiting / 60)),
					$("<td>").addClass("text-end").text(Math.round(sums.station / 60)),
				])
			),
		]),
	]);

	modal.elem.find(".modal-footer").append([
		$("<button>").addClass(["btn", "btn-danger"]).toggle(user.role == "admin").text("Löschen").click(function (e) {
			e.preventDefault();

			if (confirm("Achtung, das Löschen eines Prüflings ist nicht umkehrbar und entfernt alle Zuweisungen!")) {
				socket.send({"_m": "examinee_delete", "i": e_id});
				modal.close();
			}
		}),
		$("<button>").addClass(["btn", "btn-warning"]).toggle(user.role == "admin").text("Bearbeiten").click(function (e) {
			e.preventDefault();
			_openExamineeEditModal(e_id);
		}),
	]);

	modal.show();
}

function _openStationModal(s_id) {
	var modal = new Modal("Station " + (s_id === null ? "Pause" : data.stations[s_id].name));

	var missingExaminees = Object.keys(data.examinees);
	var assignments = [];
	var durationSum = 0;
	var durationCount = 0;

	for (const a_id of Object.keys(data.assignments)) {
		const assignment = data.assignments[a_id];

		if (assignment.station == s_id) {
			assignments.push({"i": a_id, ...assignment});
			if (assignment.result == "done") {
				durationSum += assignment.end - assignment.start;
				durationCount += 1;

				var _i = missingExaminees.indexOf(assignment.examinee);
				if (_i >= 0) {
					missingExaminees.splice(_i, 1);
				}
			}
		}
	}

	modal.elem.find(".modal-body").append([
		$("<p>").text("Hier kann die Auslastung einer Station eingesehen werden."),
		$("<h5>").text("Historie"),
		$("<table>").addClass(["table", "table-striped"]).append([
			$("<thead>").append(
				$("<tr>").append([
					$("<th>").text("Prüfling"),
					$("<th>").addClass("text-end").text("Dauer [min]"),
				])
			),
			$("<tbody>").append(
				assignments.map(function (assignment) {
					var duration = [];
					if (assignment.end === null) {
						duration.push($("<span>").text("bisher " + Math.round((Date.now() / 1000 - assignment.start) / 60)));
					} else {
						duration.push($("<span>").text(Math.round((assignment.end - assignment.start) / 60)));
					}

					var name = $("<span>").addClass("text-truncate").text(data.examinees[assignment.examinee].name);
					if (assignment.result == "canceled") {
						name.addClass("fst-italic");
						name.text(name.text() + " (abgebrochen)");
					}
					name.toggleClass("fw-bold", assignment.result == "open");
					return $("<tr>").toggleClass("fw-bold", assignment.result == "open").append([
						$("<td>").append(name),
						$("<td>").addClass("text-end").append(duration)
					]);
				})
			),
			$("<tfoot>").append(
				$("<tr>").append([
					$("<th>").text("Durchschnitt"),
					$("<th>").addClass("text-end").text(durationCount == 0 ? "unbekannt" : Math.round((durationSum / durationCount) / 60)),
				])
			),
		]),
		$("<h5>").text("Offene Prüflinge"),
			$("<table>").addClass(["table", "table-striped"]).append([
			$("<thead>").append(
				$("<tr>").append([
					$("<th>").text("Prüfling"),
				])
			),
			$("<tbody>").append(
				missingExaminees.map(function (e_id) {
					return $("<tr>").append([
						$("<td>").addClass("text-truncate").append($("<a>").attr("href", "#").text(data.examinees[e_id].name).click(function (e) {
							e.preventDefault();
							_openExamineeModal(e_id);
						})),
					]);
				})
			),
		]),
	]);

	modal.elem.find(".modal-footer").append([
		$("<button>").addClass(["btn", "btn-danger"]).toggle(s_id !== null && user.role == "admin").text("Löschen").click(function (e) {
			e.preventDefault();

			if (confirm("Achtung, das Löschen einer Station ist nicht umkehrbar und entfernt alle Zuweisungen!")) {
				socket.send({"_m": "station_delete", "i": s_id});
				modal.close();
			}
		}),
		$("<button>").addClass(["btn", "btn-warning"]).toggle(s_id !== null && user.role == "admin").text("Bearbeiten").click(function (e) {
			e.preventDefault();

			_openStationEditModal(s_id);
		}),
	]);

	modal.show();
}

function _openAssignmentModal(a_id) {
	var modal = Modal("Zuweisung");
	const assignment = data.assignments[a_id];
	const examinee = data.examinees[assignment.examinee];
	const station = data.stations[assignment.station];

	const _states = {"open": "Aktiv", "done": "Abgeschlossen", "canceled": "Abgebrochen"};

	var options = [];

	if (assignment.result == "open") {
		options.push($("<button>").addClass(["btn", "btn-primary"]).toggle(user.role.startsWith("operator")).text("Beenden").click(function () {
			socket.send({"_m": "return", "i": a_id, "result": "done"});
			modal.close();
		}));
		options.push("&nbsp;");
	}
	if (assignment.result != "canceled") {
		options.push($("<button>").addClass(["btn", "btn-warning"]).toggle(user.role.startsWith("operator")).text("Abbrechen").click(function () {
			if (confirm("Sicher, dass die Station ohne Ergebnis abgebrochen werden soll?")) {
				socket.send({"_m": "return", "i": a_id, "result": "canceled"});
				modal.close();
			}
		}));
	}

	var ende = [$("<span>").text(assignment.end === null ? "-" : formatTimestamp(assignment.end))];
	if (assignment.end !== null) {
		if (assignment.end > Date.now() / 1000) {
			ende.push($("<span>").addClass("fst-italic").text(" (noch " + Math.round((assignment.end - Date.now() / 1000) / 60) + " min)"));
		} else {
			ende.push($("<span>").addClass("fst-italic").text(" (nach " + Math.round((assignment.end - assignment.start) / 60) + " min)"));
		}
	} else {
		var expectedDuration = Examinee.estimateStationDuration(assignment.examinee, assignment.station);
		if (expectedDuration === null) {
			ende.push($("<span>").addClass(["fst-italic", "text-warning"]).text(" (keine Abschätzung möglich)"));
		} else {
			var estimatedRemaining = assignment.start + expectedDuration - Date.now() / 1000;
			if (estimatedRemaining > 0) {
				ende.push($("<span>").addClass("fst-italic").text(" (voraussichtlich noch " + Math.round(estimatedRemaining / 60) + " min)"));
			} else {
				ende.push($("<span>").addClass(["fst-italic", "text-danger"]).text(" (" + Math.round(-estimatedRemaining / 60) + " min überfällig)"));
			}
		}
	}

	modal.elem.find(".modal-body").append([
		$("<p>").text("Eine Zuweisung spiegelt den Besuch eines Prüflings an einer Station wieder. Wird eine Zuweisung beendet, zählt die Station als besucht und wird nicht erneut zugeteilt. Wird ihr Besuch abgebrochen, erfolgt später eine erneute Zuteilung."),
		$("<table>").addClass(["table", "table-striped"]).append(
			$("<tbody>").append([
				$("<tr>").append([
					$("<th>").text("Prüfling"),
					$("<td>").append(
						$("<a>").attr("href", "#").text(examinee.name).click(function (e) {
							e.preventDefault();
							_openExamineeModal(assignment.examinee);
						})
					),
				]),
				$("<tr>").append([
					$("<th>").text("Station"),
					$("<td>").append(
						assignment.station == null ? "Pause" : $("<a>").attr("href", "#").text(data.stations[assignment.station].name).click(function (e) {
							e.preventDefault();
							_openStationModal(assignment.station);
						})
					),
				]),
				$("<tr>").append([
					$("<th>").text("Status"),
					$("<td>").text(_states[assignment.result]),
				]),
				$("<tr>").append([
					$("<th>").text("Anfang"),
					$("<td>").append([
						$("<span>").text(formatTimestamp(assignment.start)),
						$("<span>").addClass("fst-italic").text(" (vor " + Math.round((Date.now() / 1000 - assignment.start) / 60) + " min)"),
					]),
				]),
				$("<tr>").append([
					$("<th>").text("Ende"),
					$("<td>").append(ende),
				]),
			])
		),
	]).append(options);

	modal.show();
}

function _generateStation(i, name) {
	var elem;
	var assignButton = $("<button>").addClass(["btn", "btn-success", "assign-examinee"]).text("Zuweisen").click(function (e) {
		e.preventDefault();

		var modal = Modal("Prüflinge zuweisen");

		function _submit(e) {
			e.preventDefault();

			var autoEnd = modal.elem.find("#minutes").val();

			var assignments = modal.elem.find("#examinees").find("option:selected").map(function (_i, elem) {
				var assignment = {"i": _gen_id(), "station": i, "examinee": $(elem).val()}
				if (autoEnd > 0) {
					assignment["autoEnd"] = autoEnd * 60;
				}
				return assignment;
			}).get();

			if (assignments.length == 0) {
				return;
			}

			for (var assignment of assignments) {
				socket.send({"_m": "assign", ...assignment})
			}

			// Open print dialog
			var frame_id = "print-" + _gen_id();
			$("body").append($("<iframe>").addClass("d-none").attr("id", frame_id).attr("name", frame_id));
			if (i === null) {
				window.frames[frame_id].document.write("<h2>Pausenankündigung</h2>");
				window.frames[frame_id].document.write("<p>Beginn: " + formatTimestamp(Date.now() / 1000) + "</p>");
				for (var assignment of assignments) {
					var label = data.examinees[assignment.examinee].name;
					if ("autoEnd" in assignment) {
						label = label + " (" + Math.round(assignment.autoEnd / 60) + " Minuten)";
					}
					window.frames[frame_id].document.write("<li>" + label + "</li>");
				}
			} else {
				for (var assignment of assignments) {
					window.frames[frame_id].document.write("<div style=\"page-break-after:right;\">" + _generatePage(assignment) + "</div>");
				}
			}
			window.frames[frame_id].document.close();
			setTimeout(function () {
				window.frames[frame_id].print();
				$("#" + frame_id).remove();
			}, 0);

			modal.close();
		}

		// Find valid examinees and sort by priorities
		var examinees = Object.keys(data.examinees);
		var examineePrefixes = [];
		for (var assignment of Object.values(data.assignments)) {
			if (assignment.result == "open" && assignment.station == i) {
				examineePrefixes.push(data.examinees[assignment.examinee].name.split(" ", 1).shift());
			}
			if ((assignment.result == "open") || (assignment.result == "done" && assignment.station == i)) {
				var _i = examinees.indexOf(assignment.examinee);
				if (_i >= 0) {
					examinees.splice(_i, 1);
				}
			}
		}
		var examinee_priorities = Object.fromEntries(examinees.map(function (e_id) {
			return [
				e_id,
				data.examinees[e_id].priority + (Examinee.calculateRemainingTime(e_id) / 60) + Math.random()
			];
		}));
		examinees.sort(function (a, b) {
			return examinee_priorities[b] - examinee_priorities[a];
		});

		// Try to use as many different prefixes (OVs) as possible
		if (i !== null) {
			var examineesPre = examinees;
			var examineesPost = [];
			examinees = [];
			for (var e_id of examineesPre) {
				var _prefix = data.examinees[e_id].name.split(" ", 1).shift();
				if (examineePrefixes.indexOf(_prefix) >= 0) {
					examineesPost.push(e_id);
				} else {
					examineePrefixes.push(_prefix);
					examinees.push(e_id);
				}
			}
			examinees = examinees.concat(examineesPost);
		}

		modal.elem.find(".modal-body").append([
			$("<p>").addClass("fw-bold").text("Station " + name),
			$("<p>").text("Um Prüflinge zuzuweisen, werden ein oder mehrere Prüflinge in der unten stehenden Liste ausgewählt. Diese enthält nur verfügbare Prüflinge und ist sortiert nach Priorität und bereits absolvierten Stationen. Es können mehrere Prüflinge gleichzeitig zugewiesen werden und optional ein automatisches Ende der Zuweisung (z.B. für Pausen) eingestellt werden:"),
			$("<form>").on("submit", _submit).append([
				$("<div>").addClass("mb-3").append([
					$("<label>").attr("for", "minutes").addClass("col-form-label").text("Automatisches Ende"),
					$("<input>").attr("type", "number").addClass("form-control").attr("id", "minutes").val(i === null ? 30 : 0)
				]),
				$("<div>").addClass("mb-3").append([
					$("<label>").attr("for", "examinees").addClass("col-form-label").text("Prüflinge"),
					$("<select>").prop("multiple", true).attr("size", 7).addClass("form-select").attr("id", "examinees").append(
						examinees.map((e_id) => $("<option>").attr("value", e_id).text(data.examinees[e_id].name)))
				]),
			]),
		]);

		var button = $("<button>").addClass(["btn", "btn-primary"]).text("Zuweisen").click(_submit);
		modal.elem.find(".modal-footer").append(button);
		modal.show();
		modal.elem.on("shown.bs.modal", function () {
			modal.elem.find("#examinees").focus();
		});
	});

	var assignments = [];
	var assignmentsFinished = 0;
	var firstStartedAssignment = null;
	var lastFinishedAssignment = null;

	for (var a_id of Object.keys(data.assignments)) {
		const assignment = data.assignments[a_id];
		if (assignment.station == i) {
			if (assignment.result == "open") {
				assignments.push(a_id);
			} else if (assignment.result == "done") {
				if (firstStartedAssignment === null || assignment.start < firstStartedAssignment) {
					firstStartedAssignment = assignment.start;
				}
				if (lastFinishedAssignment === null || assignment.end > lastFinishedAssignment) {
					lastFinishedAssignment = assignment.end;
				}
				assignmentsFinished += 1;
			}
		}
	}

	assignments.sort(function (a, b) {
		return b.start - a.start;
	});

	var end = null;
	if (firstStartedAssignment !== null && lastFinishedAssignment !== null) {
		end = lastFinishedAssignment + (Object.keys(data.examinees).length - assignmentsFinished) * (lastFinishedAssignment - firstStartedAssignment) / assignmentsFinished;
	}

	var examinees = Object.keys(data.examinees);
	for (var assignment of Object.values(data.assignments)) {
		if ((assignment.result == "open") || (assignment.result == "done" && assignment.station == i)) {
			var _i = examinees.indexOf(assignment.examinee);
			if (_i >= 0) {
				examinees.splice(_i, 1);
			}
		}
	}

	assignButton.prop("disabled", examinees.length == 0);

	const capacity = (i === null) ? null : ("capacity" in data.stations[i] ? data.stations[i].capacity : 1);
	elem = $("<div>").addClass("col").append(
		$("<div>").addClass(["card", "station-" + i]).append([
			$("<div>").addClass("card-header").text(name).click(function () {
				_openStationModal(i);
			}),
			$("<ul>").addClass(["list-group", "list-group-flush", "examinees"]).append([
				$("<li>").addClass("list-group-item").append(
					$("<div>").addClass(["progress"]).append(Object.keys(data.examinees).length == 0 ? [
						$("<div>").addClass(["progress-bar", "bg-danger"]).css("width", "100%").text(""),
					] : [
						$("<div>").addClass(["progress-bar", "bg-success"]).css("width", (assignmentsFinished / Object.keys(data.examinees).length) * 100 + "%").text(assignmentsFinished > 0 ? assignmentsFinished : ""),
						$("<div>").addClass(["progress-bar", "bg-primary"]).css("width", (assignments.length / Object.keys(data.examinees).length) * 100 + "%").text(assignments.length > 0 ? assignments.length : ""),
						$("<div>").addClass(["progress-bar", "bg-danger"]).css("width", ((Object.keys(data.examinees).length - assignmentsFinished - assignments.length) / Object.keys(data.examinees).length) * 100 + "%").text(Object.keys(data.examinees).length > assignmentsFinished + assignments.length ? Object.keys(data.examinees).length - assignmentsFinished - assignments.length : ""),
					])
				),
				$("<li>").addClass("list-group-item").append([
					$("<span>").addClass("float-end").text(end === null ? "unbekannt" : formatTimestamp(end)),
					$("<span>").text("Abschluss"),
				]),
			]).append(assignments.map(function (a_id) {
				return _buildExamineeItem(data.assignments[a_id].examinee, a_id);
			})).append(
				(i === null || capacity < assignments.length) ? [] : Array.from(Array(capacity - assignments.length)).map(function (_, j) {
					return $("<li>").addClass("list-group-item").toggleClass(["text-danger", "fw-bold"], examinees.length > j).toggleClass("text-muted", examinees.length <= j).text("(Unbesetzt)")
				})
			),
			$("<div>").addClass("card-footer").append([
				i === null ? "" : $("<div>").addClass("btn-group").toggle(user && user.role == "operator").append([
					$("<button>").addClass(["btn", "btn-secondary"]).text("-").toggle(capacity > 0).click(function () {
						socket.send({"_m": "station_capacity", "i": i, "capacity": capacity - 1});
					}),
					$("<button>").addClass(["btn", "btn-outline-secondary"]).text(capacity),
					$("<button>").addClass(["btn", "btn-secondary"]).text("+").click(function () {
						socket.send({"_m": "station_capacity", "i": i, "capacity": capacity + 1});
					}),
				]),
				" ",
				assignButton.toggle(user && user.role == "operator"),
			])
		])
	);

	return elem;
}

var Examinee = {
	calculateRemainingTime: function (e_id) {
		var examinee = data.examinees[e_id];
		var stationTimes = Object.fromEntries(Object.keys(data.stations).map((s_id) => [s_id, {"sum": 0, "count": 0}]));
		var ownTimes = Object.fromEntries(Object.keys(data.stations).map((s_id) => [s_id, null]));
		for (var assignment of Object.values(data.assignments)) {
			if (assignment.result == "done" && assignment.station !== null) {
				stationTimes[assignment.station].sum += (assignment.end - assignment.start);
				stationTimes[assignment.station].count += 1;
				if (assignment.examinee == e_id) {
					ownTimes[assignment.station] += (assignment.end - assignment.start);
				}
			}
		}
		var factorCount = 0;
		var factorSum = 0;
		var remaining = 0;
		for (var s_id in ownTimes) {
			var avgStationTime = (stationTimes[s_id].count > 0) ? (stationTimes[s_id].sum / stationTimes[s_id].count) : 0;

			if (ownTimes[s_id] === null) {
				remaining += avgStationTime;
			} else {
				factorCount += 1;
				factorSum += ownTimes[s_id] / avgStationTime;
			}
		}
		if (factorCount > 0) {
			remaining *= Math.max(0.8, Math.min(1.2, factorSum / factorCount));
		}
		return remaining;
	},
	estimateStationDuration: function (e_id, s_id) {
		var stationTimes = Object.fromEntries(Object.keys(data.stations).map((_s_id) => [_s_id, []]));
		var ownTimes = Object.fromEntries(Object.keys(data.stations).map((_s_id) => [_s_id, null]));

		// find expected Timeout from assignment history
		for (const assignment of Object.values(data.assignments)) {
			if (assignment.result == "done" && assignment.end !== null && assignment.station !== null) {
				if (assignment.examinee == e_id) {
					ownTimes[assignment.station] = assignment.end - assignment.start;
				}
				stationTimes[assignment.station].push(assignment.end - assignment.start);
			}
		}

		var factors = [];
		stationTimes = Object.fromEntries(Object.entries(stationTimes).map(([_s_id, _times]) => [_s_id, _times.length == 0 ? null : _times.reduce((_c, _v) => _v + _c, 0) / _times.length]));
		for (const _s_id of Object.keys(data.stations)) {
			if (ownTimes[_s_id] !== null && stationTimes[_s_id] !== null) {
				factors.push(ownTimes[_s_id] / stationTimes[_s_id]);
			}
		}

		// Finally try to get expectedDuration
		if (factors.length > 0 && stationTimes[s_id] !== null) {
			return stationTimes[s_id] * (factors.reduce((_c, _v) => _v + _c, 0) / factors.length);
		}
		return null;
	},
}

function _generatePage(assignment) {
	var page = $("<div>");

	var code = BARCode("A-" + assignment.i);
	var codeContainer = document.createElement("div");
	codeContainer.appendChild(code);
	var barcode = "data:image/svg+xml;base64," + window.btoa(codeContainer.innerHTML);

	var start = Date.now() / 1000;

	var header = $("<div>");
	header.append($("<table>").attr("width", "100%").append([
		$("<tr>").append([
			$("<th>").attr("width", "15%").text("Station"),
			$("<td>").css("overflow-wrap", "anywhere").attr("width", "45%").text(data.stations[assignment.station].name),
			$("<td>").attr("rowspan", "3").css("text-align", "center").append([
				$("<img>").attr("src", barcode),
				$("<div>").text("A-" + assignment.i)
			])
		]),
		$("<tr>").append([
			$("<th>").text("Helfer"),
			$("<td>").css("overflow-wrap", "anywhere").text(data.examinees[assignment.examinee].name),
		]),
		$("<tr>").append([
			$("<th>").text("Startzeit"),
			$("<td>").text(formatTimestamp(start)),
		]),
	]));

	header.append($("<p>").html("Der Bewertungsbogen spiegelt die Leistung des Prüflings separiert nach den einzelnen Aufgaben wieder. Erforderliche Prüfungspunkte sind als <b>Rechteck</b>, optionale Prüfungspunkte als <b>Kreis</b> dargestellt. Bitte setze für jeden Prüfungspunkt <b>entweder</b> eine Kreuz in der Spalte &quot;B&quot; wie Bestanden oder &quot;n.B.&quot; für nicht Bestanden."));

	var body = $("<div>").css("columns", "2 auto");

	for (var task of data.stations[assignment.station].tasks) {
		body.append($("<div>").css("padding", "10px").css("break-inside", "avoid").append([
			$("<table>").css("width", "100%").css("border", "1px dotted black").css("border-collapse", "collapse").append([
				$("<tr>").append([
					$("<th>").css("text-align","left").attr("colspan", 3).text(task.name)
				]),
				$("<tr>").css("border-bottom", "1px dotted black").append([
					$("<th>").attr("width", "70%").text((task.min_tasks || task.parts.length) + " von " + task.parts.length),
					$("<th>").attr("width", "15%").text("B"),
					$("<th>").attr("width", "15%").text("n.B."),
				])
			]).append(task.parts.map(function (part) {
				var field = $("<div>").text(" ").css({
					"margin": "auto",
					"width": "15px",
					"height": "15px",
					"border": "3px solid black",
				});
				if (!part.mandatory) {
					field.css("border-radius", "20px");
				}
				return $("<tr>").append([
					$("<td>").text(part.name),
					$("<td>").append(field.clone()),
					$("<td>").append(field.clone()),
				]);
			})).append(
				$("<tr>").css("border-top", "1px dotted black").append([
					$("<th>").text("Gesamt"),
					$("<th>").append(
						$("<div>").text(" ").css({
							"margin": "auto",
							"width": "15px",
							"height": "15px",
							"border": "3px solid black",
						})
					),
					$("<th>").append(
						$("<div>").text(" ").css({
							"margin": "auto",
							"width": "15px",
							"height": "15px",
							"border": "3px solid black",
						})
					),
				])
			)
		]));
	}

	page.append($("<table>").append([
		$("<thead>").css("position", "sticky").append(
			$("<tr>").append(
				$("<td>").append(header)
			)
		),
		$("<tbody>").css("inset-block-start", "0").append(
			$("<tr>").append(
				$("<td>").append(body)
			)
		),
	]));

	return page.html();
}

function formatTimestamp(timestamp) {
	const date = new Date(timestamp * 1000);
	return (
		(date.getDate() < 10 ? "0" : "") + date.getDate() + "." +
		(date.getMonth() < 9 ? "0" : "") + (date.getMonth() + 1) + "." +
		date.getFullYear() + " " +
		(date.getHours() < 10 ? "0" : "") + date.getHours() + ":" +
		(date.getMinutes() < 10 ? "0" : "") + date.getMinutes());
}

function Modal(title) {
	var m_id = _gen_id();
	var wrap = _buildModal(title);

	var bsModal = bootstrap.Modal.getOrCreateInstance(wrap);

	ret = {
		"elem": $(wrap),
		"show": function () {
			bsModal.show();
		},
		"close": function () {
			bsModal.hide();
		},
	}
	$("body").append(ret.elem);
	ret.elem.on("hidden.bs.modal", function () {
		ret.elem.remove();
	});
	return ret;
}

function _buildModal(title) {
	var modal = document.createElement('div');
	modal.setAttribute('class', 'modal fade');
	modal.setAttribute('tabindex', '-1');
	modal.setAttribute('aria-labelledby', 'modalLabel');
	modal.setAttribute('aria-hidden', 'true');
	var modDialog = document.createElement('div');
	modDialog.setAttribute('class', 'modal-dialog');
	var modContent = document.createElement('div');
	modContent.setAttribute('class', 'modal-content');
	var header = _buildModalHeader(title);
	modContent.append(header);
	var body = document.createElement('div');
	body.setAttribute('class', 'modal-body');
	modContent.append(body);
	var footer = document.createElement('div');
	footer.setAttribute('class', 'modal-footer');
	footer.setAttribute('style', 'border-top: none;')
	modContent.append(footer);
	modDialog.append(modContent);
	modal.append(modDialog);
	return modal;
}

function _buildModalHeader(text) {
	var header = document.createElement('div');
	header.setAttribute('class', 'modal-header');
	header.setAttribute('style', 'border-bottom: none;');

	var title = document.createElement('h5');
	title.setAttribute('class', 'modal-title');
	title.setAttribute('id', 'modalLabel');
	title.innerText = text;

	var closeBtn = document.createElement('button');
	closeBtn.setAttribute('class', 'btn-close');
	closeBtn.setAttribute('data-bs-dismiss', 'modal');
	closeBtn.setAttribute('aria-label', 'Close');

	header.append(title);
	header.append(closeBtn);
	return header;
}

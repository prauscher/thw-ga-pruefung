var data = {};

$(function () {
	// Overwrite app_token if one is given
	if (location.hash.length > 1) {
		localStorage.setItem("app_token", location.hash.substring(1));
		location.hash = "";
	}

	socket = ReliableWebSocket({
		on_close: function () {
			$("#socketIndicator").text("Offline").addClass("bg-danger").removeClass("bg-success");
		},
		on_login: function (user) {
			$("#socketIndicator").text("Online").addClass("bg-success").removeClass("bg-danger");
			$("#username").text(user.name);
			$("#admin").toggle(user.grant ? true : false);
		},
		on_auth_required: function (data) {
			if (data.first_login) {
				var modal = Modal("Erstelle Benutzer");
				var token = _gen_id() + _gen_id();

				function _submit(e) {
					e.preventDefault();
					var token = modal.elem.find("#token").val();
					localStorage.setItem("app_token", token);
					socket.send({"_m": "_create_user", "token": token, "name": modal.elem.find("#name").val(), "grant": true})
					modal.close();
				}

				modal.elem.find(".modal-body").append([
					$("<p>").text("Willkommen beim GA-Prüfungsmonitor. Dieses Tool soll bei der Durchführung der GA-Prüfung unterstützen. Da dies dein erster Aufruf ist, muss ein erster Administrator-Benutzer eingerichtet werden. Bitte vergebe hier einen Namen für diesen und notiere dir den hier angezeigten Token:"),
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
				modal.elem.find(".modal-footer").append(button);
				modal.show();
				modal.elem.on("shown.bs.modal", function () {
					modal.elem.find("#name").focus();
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

				// need to show modal, possibly with message
				var modal = Modal("Anmeldung");

				function _submit(e) {
					e.preventDefault();
					var token = modal.elem.find("#token").val();
					localStorage.setItem("app_token", token);
					socket.send({"_m": "_login", "token": token});
					modal.close();
				}

				modal.elem.find(".modal-body").append([
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
					modal.elem.find("#alerts").append($("<div>").attr("role", "alert").addClass(["alert", "alert-danger"]).text(data.message));
				}

				var button = $("<button>").addClass(["btn", "btn-primary"]).text("Anmelden").click(_submit);
				modal.elem.find(".modal-footer").append(button);
				modal.show();
				modal.elem.on("shown.bs.modal", function () {
					modal.elem.find("#token").focus();
				});
			}
		},
		on_init: function (state) {
			console.log("INIT", state);
			data = state;
			render();
		},
		handlers: {
			"station": function (msg) {
				data.stations[msg.i] = msg;
				render();
			},
			"examinee": function (msg) {
				data.examinees[msg.i] = msg;
				render();
			},
			"assignment": function (msg) {
				data.assignments[msg.i] = msg;
				render();
			},
			"users": function (msg) {
				var modal = Modal("Benutzerverwaltung");

				function _create(e) {
					e.preventDefault();

					var user = {
						"token": modal.elem.find("#token").val(),
						"name": modal.elem.find("#username").val(),
						"grant": modal.elem.find("#grant").is(":checked")
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
						$("<td>").toggleClass("fw-bold", msg.users[u_id].grant).text(msg.users[u_id].name),
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
								$("<th>").attr("colspan", 2).text("Benutzername"),
							])
						),
						$("<tbody>").attr("id", "users").append(
							Object.keys(msg.users).map(_buildUserRow)
						),
						$("<tfoot>").append(
							$("<tr>").append(
								$("<th>").attr("colspan", 2).append([
									$("<form>").on("submit", _create).append([
										$("<div>").addClass("mb-3").append([
											$("<label>").attr("for", "token").addClass("col-form-label").text("Token"),
											$("<input>").attr("type", "text").prop("disabled", true).addClass("form-control").attr("id", "token").val(_gen_id() + _gen_id())
										]),
										$("<div>").addClass("mb-3").append([
											$("<label>").attr("for", "username").addClass("col-form-label").text("Benutzername"),
											$("<input>").attr("type", "text").addClass("form-control").attr("id", "username")
										]),
										$("<div>").addClass(["form-check", "mb-3"]).append([
											$("<input>").attr("type", "checkbox").addClass("form-check-input").attr("id", "grant"),
											$("<label>").attr("for", "grant").addClass("form-check-label").text("Priviligiert"),
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
		var modal = Modal("Prüflinge eintragen");

		function _submit(e) {
			e.preventDefault();

			for (var name of modal.elem.find("#names").val().split("\n").values()) {
				name = name.trim();
				if (name != "") {
					socket.send({"_m": "examinee", "i": _gen_id(), "name": name, "priority": modal.elem.find("#priority").val()});
				}
			}

			modal.close();
		}

		modal.elem.find(".modal-body").append([
			$("<p>").text("Prüflinge werden primär anhand ihres Namens verwaltet. Dieses Formular erlaubt es, einen oder mehrere Prüflinge anzulegen. Die Prüflinge müssen dabei mit einem Namen pro Zeile angegeben werden. Prüflinge mit höherer Priorität werden bevorzugt auf Stationen gebucht (z.B. für Jugend-Goldabzeichen):"),
			$("<form>").on("submit", _submit).append([
				$("<div>").addClass("mb-3").append([
					$("<label>").attr("for", "priority").addClass("col-form-label").text("Priorität"),
					$("<input>").attr("type", "number").addClass("form-control").attr("id", "priority").val("100")
				]),
				$("<div>").addClass("mb-3").append([
					$("<label>").attr("for", "names").addClass("col-form-label").text("Namen"),
					$("<textarea>").addClass("form-control").attr("rows", 15).attr("id", "names")
				]),
			]),
		]);

		var button = $("<button>").addClass(["btn", "btn-primary"]).text("Eintragen").click(_submit);
		modal.elem.find(".modal-footer").append(button);
		modal.show();
		modal.elem.on("shown.bs.modal", function () {
			modal.elem.find("#names").focus();
		});
	});

	$("#station-add").click(function () {
		var modal = Modal("Station anlegen");

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
					// First line of a Task (name)
					currentTask = {"name": line, "parts": []};
				} else {
					// must be a singe task, prefixed with P or O
					currentTask.parts.push({"name": line.substring(2), "mandatory": line.substring(0, 1) != "O"});
				}
			}

			socket.send({"_m": "station", "i": _gen_id(), "name": modal.elem.find("#name").val(), "tasks": tasks});

			modal.close();
		}

		var predefinedTasks = $("<select>").prop("multiple", true).attr("size", 7).addClass("form-select").attr("id", "predefined_tasks").append(
			tasks.map((task) => $("<option>").data("preset", task.name + "\n" + task.parts.map((p) => (p.mandatory ? "P " : "O ") + p.name).join("\n")).text(task.name))
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
					$("<input>").attr("type", "text").addClass("form-control").attr("id", "name")
				]),
				$("<div>").addClass("mb-3").append([
					$("<label>").attr("for", "predefined_tasks").addClass("col-form-label").text("Vordefinierte Aufgaben"),
					predefinedTasks
				]),
				$("<div>").addClass("mb-3").append([
					$("<label>").attr("for", "tasks").addClass("col-form-label").text("Aufgaben"),
					$("<textarea>").attr("rows", 7).addClass("form-control").attr("id", "tasks"),
				]),
			]),
		]);

		var button = $("<button>").addClass(["btn", "btn-primary"]).text("Eintragen").click(_submit);
		modal.elem.find(".modal-footer").append(button);
		modal.show();
		modal.elem.on("shown.bs.modal", function () {
			modal.elem.find("#name").focus();
		});
	});
});

var tasks = [
	{"name": "Aufgabe 1", "parts": [
		{"name": "Aufgabe gelesen", "mandatory": true},
		{"name": "Aufgabe verstanden", "mandatory": false},
	]},
	{"name": "Aufgabe 2", "parts": [
		{"name": "Test", "mandatory": true},
	]},
	{"name": "Aufgabe 3", "parts": [
		{"name": "Aufgabe gelesen", "mandatory": true},
		{"name": "Aufgabe verstanden", "mandatory": false},
	]},
	{"name": "Aufgabe 4", "parts": [
		{"name": "Test", "mandatory": true},
	]},
];

function render() {
	var examineesWaiting = Object.keys(data.examinees);
	var examineesInStation = Object.fromEntries(Object.keys(data.stations).map((s_id) => [s_id, []]));
	examineesInStation[null] = [];

	for (var a_id of Object.keys(data.assignments)) {
		const assignment = data.assignments[a_id];
		if (assignment.result == "open") {
			examineesInStation[assignment.station].push(a_id);
			var _i = examineesWaiting.indexOf(assignment.examinee);
			if (_i >= 0) {
				examineesWaiting.splice(_i, 1);
			}
		}
	}

	$("#examinees").empty().append(examineesWaiting.map(function (e_id) {
		return _buildExamineeItem(e_id, null);
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
		return _generateStation(s_id, data.stations[s_id].name, examineesInStation[s_id]);
	}));

	$("#pause-container").empty().append(_generateStation(null, "Pause", examineesInStation[null]));
}

function _buildExamineeItem(e_id, a_id) {
	return $("<li>").addClass("list-group-item").text(data.examinees[e_id].name).click(function () {
		if (a_id !== null) {
			_openAssignmentModal(a_id);
		} else {
			_openExamineeModal(e_id);
		}
	});
}

function _openAssignmentModal(a_id) {
	var modal = Modal("Zuweisung");
	const assignment = data.assignments[a_id];
	const examinee = data.examinees[assignment.examinee];
	const station = data.stations[assignment.station];

	const _states = {"open": "Aktiv", "done": "Abgeschlossen", "canceled": "Abgebrochen"};

	var options = [];

	if (assignment.result == "open") {
		options.push($("<button>").addClass(["btn", "btn-primary"]).text("Beenden").click(function () {
			socket.send({"_m": "return", "i": a_id, "result": "done"});
			modal.close();
		}));
		options.push("&nbsp;");
	}
	options.push($("<button>").addClass(["btn", "btn-warning"]).text("Abbrechen").click(function () {
		if (confirm("Sicher, dass die Station ohne Ergebnis abgebrochen werden soll?")) {
			socket.send({"_m": "return", "i": a_id, "result": "canceled"});
			modal.close();
		}
	}));

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
					$("<td>").text(formatTimestamp(assignment.start)),
				]),
				$("<tr>").append([
					$("<th>").text("Ende"),
					$("<td>").text(assignment.end === null ? "-" : formatTimestamp(assignment.end)),
				]),
			])
		),
	]).append(options);

	modal.show();
}

function _generateStation(i, name, assignments) {
	var elem;
	var assignButton = $("<button>").addClass(["btn", "btn-success"]).text("Zuweisen").click(function (e) {
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
					window.frames[frame_id].document.write("<li>" + data.examinees[assignment.examinee].name + "</li>");
				}
			} else {
				for (var assignment of assignments) {
					window.frames[frame_id].document.write("<div style=\"page-break-after:always;\">" + _generatePage(assignment) + "</div>");
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
		for (var assignment of Object.values(data.assignments)) {
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

	assignments.sort(function (a, b) {
		return b.start - a.start;
	});
	elem = $("<div>").addClass("col").append(
		$("<div>").addClass(["card", "station-" + i]).append([
			$("<div>").addClass("card-header").text(name),
			$("<ul>").addClass(["list-group", "list-group-flush", "examinees"]).append(assignments.map(function (a_id) {
				return _buildExamineeItem(data.assignments[a_id].examinee, a_id);
			})),
			$("<div>").addClass("card-footer").append([
				assignButton
			])
		])
	);

	return elem;
}

var Examinee = {
	calculateRemainingTime: function (e_id) {
		var examinee = data.examinees[e_id];
		var remaining = 0;
		var stationTimes = Object.fromEntries(Object.keys(data.stations).map((s_id) => [s_id, {"sum": 0, "count": 0}]));
		var ownTimes = Object.fromEntries(Object.keys(data.stations).map((s_id) => [s_id, null]));
		for (var assignment of Object.values(data.assignments)) {
			if (assignment.result == "done" && assignment.station !== null) {
				stationTimes[assignment.station].sum += (assignment.end - assignment.start)
				stationTimes[assignment.station].count += 1
				if (assignment.examinee == e_id) {
					ownTimes[assignment.station] += (assignment.end - assignment.start);
				}
			}
		}
		var factorCount = 0;
		var factorSum = 0;
		for (var s_id in ownTimes) {
			var avgStationTime;
			if (stationTimes[s_id].count > 0) {
				avgStationTime = stationTimes[s_id].sum / stationTimes[s_id].count;
			} else {
				avgStationTime = 0;
			}

			if (ownTimes[s_id] === null) {
				remaining += avgStationTime;
			} else {
				factorCount += 1;
				factorSum += ownTimes[s_id] / avgStationTime;
			}
		}
		if (factorCount > 0) {
			remaining *= (factorSum / factorCount);
		}
		return remaining;
	}
}

function _generatePage(assignment) {
	var page = $("<div>");

	var code = BARCode("A-" + assignment.i);
	var codeContainer = document.createElement("div");
	codeContainer.appendChild(code);

	var start = Date.now() / 1000;

	page.append($("<table>").attr("width", "100%").append([
		$("<tr>").append([
			$("<th>").attr("width", "15%").text("Station"),
			$("<td>").attr("width", "45%").text(data.stations[assignment.station].name),
			$("<td>").attr("rowspan", "3").css("text-align", "center").append([
				codeContainer,
				$("<div>").text("A-" + assignment.i)
			])
		]),
		$("<tr>").append([
			$("<th>").text("Helfer"),
			$("<td>").text(data.examinees[assignment.examinee].name),
		]),
		$("<tr>").append([
			$("<th>").text("Startzeit"),
			$("<td>").text(formatTimestamp(start)),
		]),
	]));

	page.append($("<p>").html("Der Bewertungsbogen spiegelt die Leistung des Prüflings separiert nach den einzelnen Aufgaben wieder. Erforderliche Prüfungspunkte sind als <b>Rechteck</b>, optionale Prüfungspunkte als <b>Kreis</b> dargestellt. Bitte setze für jeden Prüfungspunkt <b>entweder</b> eine Kreuz in der Spalte &quot;B&quot; wie Bestanden oder &quot;n.B.&quot; für nicht Bestanden."));

	for (var task of data.stations[assignment.station].tasks) {
		page.append($("<div>").css("float", "left").css("padding", "10px").css("width", "45%").append([
			$("<table>").css("width", "100%").css("border", "1px dotted black").css("border-collapse", "collapse").append([
				$("<tr>").append([
					$("<th>").css("text-align","left").attr("colspan", 3).text(task.name)
				]),
				$("<tr>").css("border-bottom", "1px dotted black").append([
					$("<th>").attr("width", "70%").text(" "),
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
			}))
		]));
	}

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

var data = {};
var user = null;

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
			$("<p>").text("Prüflinge werden primär anhand ihres Namens verwaltet. Dieses Formular erlaubt es, einen oder mehrere Prüflinge anzulegen. Die Prüflinge müssen dabei mit einem Namen pro Zeile angegeben werden. Die Priorität verschafft Prüflingen einen virtuellen Zeitvorsprung, damit ihre Prüfung früher beendet wird (z.B. für Jugend-Goldabzeichen):"),
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
		if (assignment.result == "done") {
			var _i = examineesWaitingMissingStations.indexOf(assignment.station);
			if (_i >= 0) {
				examineesWaitingMissingStations.splice(_i, 1);
			}
		}
	}
	examineesWaiting.sort(function (a, b) {
		// Make sure completed users are listed down below
		if (examineesWaitingMissingStations[a].length != examineesWaitingMissingStations[b].length) {
			if (examineesWaitingMissingStations[a] == 0) {
				return -1;
			}
			if (examineesWaitingMissingStations[b] == 0) {
				return 1;
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
	$("#examinees").empty().append(examineesWaiting.map(function (e_id) {
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
	return $("<li>").addClass(["list-group-item", "examinee-" + e_id]).text(data.examinees[e_id].name).click(function () {
		if (a_id !== null) {
			_openAssignmentModal(a_id);
		} else {
			_openExamineeModal(e_id);
		}
	});
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
			if (assignment.result != "canceled") {
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
	for (const s_id of Object.keys(stationTimes)) {
		if (stationTimes[s_id].count > 0) {
			stationTimes[s_id] = stationTimes[s_id].sum / stationTimes[s_id].count;
		} else {
			stationTimes[s_id] = null;
		}
	}

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
					$("<th>").addClass("text-end").text(Math.round(missingStations.reduce((sum, s_id) => sum + stationTimes[s_id] || 0, 0) / 60))
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

					var name = $("<span>").text(data.examinees[assignment.examinee].name);
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
						$("<td>").append($("<a>").attr("href", "#").text(data.examinees[e_id].name).click(function (e) {
							e.preventDefault();
							_openExamineeModal(e_id);
						})),
					]);
				})
			),
		]),
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
		options.push($("<button>").addClass(["btn", "btn-primary"]).text("Beenden").click(function () {
			socket.send({"_m": "return", "i": a_id, "result": "done"});
			modal.close();
		}));
		options.push("&nbsp;");
	}
	if (assignment.result != "canceled") {
		options.push($("<button>").addClass(["btn", "btn-warning"]).text("Abbrechen").click(function () {
			if (confirm("Sicher, dass die Station ohne Ergebnis abgebrochen werden soll?")) {
				socket.send({"_m": "return", "i": a_id, "result": "canceled"});
				modal.close();
			}
		}));
	}

	var ende = [$("<span>").text(assignment.end === null ? "-" : formatTimestamp(assignment.end))];
	if (assignment.end !== null && assignment.end > Date.now() / 1000) {
		ende.push($("<span>").addClass("fst-italic").text(" (noch " + Math.round((assignment.end - Date.now() / 1000) / 60) + " Minuten)"));
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
					$("<td>").text(formatTimestamp(assignment.start)),
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

	assignButton.prop("disabled", Object.keys(data.examinees).length <= assignmentsFinished + assignments.length);

	assignments.sort(function (a, b) {
		return b.start - a.start;
	});

	var end = null;
	if (firstStartedAssignment !== null && lastFinishedAssignment !== null) {
		end = lastFinishedAssignment + (Object.keys(data.examinees).length - assignmentsFinished) * (lastFinishedAssignment - firstStartedAssignment) / assignmentsFinished;
	}

	elem = $("<div>").addClass("col").append(
		$("<div>").addClass(["card", "station-" + i]).append([
			$("<div>").addClass("card-header").text(name).click(function () {
				_openStationModal(i);
			}),
			$("<ul>").addClass(["list-group", "list-group-flush", "examinees"]).append([
				$("<li>").addClass("list-group-item").append(
					$("<div>").addClass(["progress"]).append([
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
			})),
			$("<div>").addClass("card-footer").append([
				assignButton.toggle(user && user.role == "operator")
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
				stationTimes[assignment.station].sum += (assignment.end - assignment.start);
				stationTimes[assignment.station].count += 1;
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
			remaining *= Math.max(0.8, Math.min(1.2, factorSum / factorCount));
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

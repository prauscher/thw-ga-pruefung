var data = {};
var user = null;
// Default colors
var flag_colors = ["#007bff", "#dc3545", "#ffc107", "#28a745"];
const fixedStations = {
	"_theorie": {"name": "Theorie"},
	"_pause": {"name": "Pause"},
};

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

var aufgaben = null;

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
			$("#admin").toggle(user.role == "admin");
			$("#examinee-add").toggle(user.role == "admin");
			$("#station-add").toggle(user.role == "admin");
			$(".assign-examinee").toggle(user.role == "operator");
			$("nav.navbar").toggleClass("bg-dark", user.role != "admin").toggleClass("bg-danger", user.role == "admin");
		},
		on_auth_required: function (data) {
			if (data.first_login) {
				// Do not open modal over modal
				if (startModal !== null) {
					return;
				}

				startModal = new Modal("Erstelle Benutzer");
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
				startModal = new Modal("Anmeldung");

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
			if (Object.keys(data.stations) == 0) {
				showWizard();
			}
		},
		handlers: {
			"set_global_settings": function (msg) {
				data.serie_id = msg.serie_id;
				data.ort = msg.ort;
				data.pruefungsleiter = msg.pruefungsleiter;
				render();
			},
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
				var modal = new Modal("Benutzerverwaltung");

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

	$("#export").click(function () {
		var csvContent = "data:text/csv;charset=utf-8,";

		csvContent += "Prüfling,Station,Start,Ende,Dauer\r\n";
		for (var a_id of Object.keys(data.assignments)) {
			const assignment = data.assignments[a_id];
			if (assignment.result == "open" || assignment.result == "done") {
				csvContent += '"' + data.examinees[assignment.examinee].name.replace('"', '""') + '",';
				csvContent += '"' + (assignment.station.startsWith("_") ? fixedStations[assignment.station].name : data.stations[assignment.station].name).replace('"', '""') + '",';
				csvContent += '"' + formatTimestamp(assignment.start) + '",';
				csvContent += '"' + (assignment.end === null ? "" : formatTimestamp(assignment.end)) + '",';
				csvContent += '"' + (assignment.end === null ? "" : Math.round((assignment.end - assignment.start) / 60)) + '"\r\n';
			}
		}

		var link = document.createElement("a");
		link.setAttribute("href", encodeURI(csvContent));
		link.setAttribute("download", "export-pruefung.csv");
		document.body.appendChild(link);
		link.click();
		setTimeout(0, function() {document.body.removeChild(link);});
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
		const now = new Date();
		$("#clock").text(formatNumber(now.getHours()) + ":" + formatNumber(now.getMinutes()));
		$(".best-before").each(function (_i, elem) {
			formatBestBefore($(elem));
		});
	}, 1000);

	$.get({
		url: "/static/aufgaben.json",
		success: function (data) {
			aufgaben = data;
		},
		dataType: "json",
	});
});

function formatNumber(number) {
	return (number < 10 ? "0" : "") + number;
}

var wizardModal = null;

function showWizard() {
	// wait until aufgaben is filled from remote
	if (aufgaben == null) {
		window.setTimeout(showWizard, 100);
		return;
	}

	var serien = {};
	for (const task of aufgaben) {
		for (const serie of task.serien) {
			if (!(serie.serie in serien)) {
				serien[serie.serie] = {"stations": {}};
			}
			if (!(serie.station in serien[serie.serie].stations)) {
				serien[serie.serie].stations[serie.station] = [];
			}
			serien[serie.serie].stations[serie.station].push({
				"lfd": serie.lfd,
				"name": serie.lfd + " " + task.name,
				"min_tasks": task.min_tasks,
				"parts": task.parts,
				"notes": task.notes,
			});
			serien[serie.serie].stations[serie.station].sort((a, b) => a.lfd - b.lfd);
		}
	}

	// need to show modal, possibly with message
	wizardModal = new Modal("Willkommen");

	var buttons = [];
	var input_ort = $("<input>");
	var input_pruefungsleiter = $("<input>");

	for (const [serie, data] of Object.entries(serien)) {
		buttons.push($("<button>").attr("type", "button").addClass(["btn", "btn-primary", "d-block", "mb-2"]).text("Serie " + serie).click(function (e) {
			e.preventDefault();

			socket.send({"_m": "set_global_settings", "serie_id": serie, "ort": input_ort.val(), "pruefungsleiter": input_pruefungsleiter.val()});

			for (const [station_name, tasks] of Object.entries(data.stations)) {
				var names = station_name.split(" ");
				const pdf_name = names.splice(0, 1).join(" ");
				const name = names.join(" ");
				socket.send({"_m": "station", "i": _gen_id(), "name": name, "name_pdf": pdf_name, "tasks": tasks});
			}

			wizardModal.close();
		}));
	}

	wizardModal.elem.find(".modal-body").append([
		$("<p>").text("Bisher wurden keine Stationen angelegt. Hier kannst du direkt eine Prüfungsserie laden, um schneller starten zu können. Wenn du ohne vorbereitete Prüfungsserie starten möchtest, schließe dieses Popup einfach wieder."),
		$("<form>").append([
			$("<div>").addClass("mb-3").append([
                                $("<label>").attr("for", "ort").addClass("col-form-label").text("Ort der Prüfung"),
                                input_ort.attr("type", "text").addClass("form-control").attr("id", "ort").val("Darmstadt")
                        ]),
			$("<div>").addClass("mb-3").append([
                                $("<label>").attr("for", "pruefungsleiter").addClass("col-form-label").text("Prüfungsleiter"),
                                input_pruefungsleiter.attr("type", "text").addClass("form-control").attr("id", "pruefungsleiter").val("")
                        ]),
		]),
		$("<div>").append(buttons)
	]);

	wizardModal.show();
	wizardModal.elem.on("hidden.bs.modal", function () {
		wizardModal = null;
	});
}

function _openExamineeEditModal(e_id) {
	var modal = new Modal(e_id === null ? "Prüflinge eintragen" : "Prüfling " + data.examinees[e_id].name + " bearbeiten");

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
		$("<p>").text("Prüflinge werden primär anhand ihres Namens verwaltet. Dieses Formular erlaubt es, einen oder mehrere Prüflinge anzulegen. Die Prüflinge müssen dabei mit einem Namen und OV pro Zeile angegeben werden (z.B. ODAR Markus Kaup) - die OV-Kürzel werden verwendet um möglichst verschiedene OVs zu einer Station zu entsenden. Eine höhere Priorität verschafft Prüflingen einen virtuellen Zeitvorsprung, damit ihre Prüfung früher beendet wird (z.B. für Jugend-Goldabzeichen):"),
		$("<form>").append([
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
	var modal = new Modal(s_id === null ? "Station anlegen" : "Station " + data.stations[s_id].name + " bearbeiten");

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
				currentTask = {"name": _words.join(" "), "min_tasks": min_tasks, "parts": [], "notes": []};
			} else if (line.substring(0, 1) == "P") {
				// single mandatory task
				currentTask.parts.push({"name": line.substring(2), "mandatory": true});
			} else if (line.substring(0, 1) == "O") {
				// single optional task
				currentTask.parts.push({"name": line.substring(2), "mandatory": false});
			} else if (line.substring(0, 1) == "*") {
				// note
				currentTask.notes.push(line);
			}
		}

		socket.send({"_m": "station", "i": s_id || _gen_id(), "name": modal.elem.find("#name").val(), "name_pdf": modal.elem.find("#name_pdf").val(), "tasks": tasks});

		modal.close();
	}

	var _tasks = "";
	if (s_id !== null) {
		var task_definitions = data.stations[s_id].tasks.map((task) => task.min_tasks + " " + task.name + "\n" + task.parts.map((p) => (p.mandatory ? "P " : "O ") + p.name).concat(task.notes || []).join("\n"));
		_tasks = task_definitions.join("\n\n");
	}

	var predefinedTasks = $("<select>").prop("multiple", true).attr("size", 7).addClass("form-select").attr("id", "predefined_tasks").append(
		aufgaben.map(function (task) {
			var _preset = task.min_tasks + " " + task.name + "\n" + task.parts.map((p) => (p.mandatory ? "P " : "O ") + p.name).concat(task.notes || []).join("\n");
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
		$("<form>").append([
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "name").addClass("col-form-label").text("Name"),
				$("<input>").attr("type", "text").addClass("form-control").attr("id", "name").val(s_id === null ? "" : data.stations[s_id].name)
			]),
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "name_pdf").addClass("col-form-label").text("Stationsnummer (römisch)"),
				$("<input>").attr("type", "text").addClass("form-control").attr("id", "name_pdf").val(s_id === null ? "" : data.stations[s_id].name_pdf)
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
	if (examineesWaiting.length == 0) {
		$("#examinees").append(
			$("<li>").addClass(["list-group-item", "text-italic"]).append("(Leer)")
		);
	}

	var station_ids = Object.keys(data.stations);
	station_ids.sort(function (a, b) {
		let _a = data.stations[a].name.toLowerCase();
		let _b = data.stations[b].name.toLowerCase();
		if (_a < _b) {return -1;}
		if (_a > _b) {return 1;}
		return 0;
	});
	$("#stations").empty().append(station_ids.map(function (s_id) {
		return _generateStation(s_id);
	}));

	$("#pause-container").empty().append([
		_generateStation("_theorie").addClass("mb-3"),
		_generateStation("_pause"),
	]);
}

function _buildExamineeItem(e_id, a_id) {
	var node = $("<li>").addClass(["list-group-item", "examinee-" + e_id, "text-truncate"]).click(function () {
		if (a_id !== null) {
			_openAssignmentModal(a_id);
		} else {
			_openExamineeModal(e_id);
		}
	});

	var openFixedStations = Object.keys(fixedStations);
	var openStations = Object.keys(data.stations);
	for (var assignment of Object.values(data.assignments)) {
		if (assignment.examinee == e_id) {
			if (assignment.station.startsWith("_")) {
				var _i = openFixedStations.indexOf(assignment.station);
				if (_i >= 0) {
					openFixedStations.splice(_i, 1);
				}
			} else {
				var _i = openStations.indexOf(assignment.station);
				if (_i >= 0) {
					openStations.splice(_i, 1);
				}
			}
		}
	}

	var state_indicator = "bg-danger";
	if (openFixedStations.indexOf("_pause") < 0) {
		state_indicator = "bg-success";
	}
	node.append($("<span>").addClass(["badge", "me-1", state_indicator]).text(openStations.length));
	node.append(data.examinees[e_id].name);
	node.append("flags" in data.examinees[e_id] ? data.examinees[e_id].flags.map((color) => $("<span>").css("color", color).append([" ", circle.clone()])) : []);

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
			node.addClass("best-before").data("best-before", expectedTimeout);
			formatBestBefore(node);
		}
	}

	return node;
}

function formatBestBefore(node) {
	node.toggleClass(["text-danger"], Date.now() / 1000 > node.data("best-before"));
	node.toggleClass(["fw-bold"], Date.now() / 1000 - (10 * 60) > node.data("best-before"));
}

function _openExamineeModal(e_id) {
	const examinee = data.examinees[e_id];
	var modal = new Modal("Prüfling " + examinee.name);

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

		if (assignment.result == "done" && !assignment.station.startsWith("_")) {
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
	} else if (currentAssignment.station === "_theorie") {
		currentAssignmentText = "Der*die Prüfling befindet sich seit " + formatTimestamp(currentAssignment.start) + " in der Theorieprüfung";
	} else if (currentAssignment.station === "_pause") {
		currentAssignmentText = "Der*die Prüfling befindet sich bis " + formatTimestamp(currentAssignment.end) + " in Pause";
	} else {
		currentAssignmentText = "Der*die Prüfling befindet sich seit " + formatTimestamp(currentAssignment.start) + " an Station " + data.stations[currentAssignment.station].name + "( " + data.stations[currentAssignment.station].name_pdf + ")";
	}

	var now = firstStart;
	var assignmentEntries = [];
	var sums = {"waiting": 0, "station": 0};
	for (const assignment of assignments) {
		var name = assignment.station.startsWith("_") ? fixedStations[assignment.station].name : data.stations[assignment.station].name;
		if (assignment.result === "canceled") {
			name = name + " (Abgebrochen)";
		}
		var duration = (assignment.end || Date.now() / 1000) - assignment.start;
		var usage = stationTimes[assignment.station] === null ? 1.0 : duration / stationTimes[assignment.station];
		var durationContent = [$("<span>").text(Math.round(duration / 60))];
		if (assignment.result === "done" && !assignment.station.startsWith("_")) {
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
		assignmentEntries.push($("<tr>").append([
			$("<td>").toggleClass("fst-italic", assignment.station.startsWith("_") || assignment.result == "canceled").append(
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
	if (now !== null && missingStations.length > 0) {
		assignmentEntries.push($("<tr>").append([
			$("<td>").addClass("fst-italic").text(" "),
			$("<td>").addClass("text-end").text(Math.round((Date.now() / 1000 - now) / 60)),
			$("<td>").addClass("text-end").text(" "),
		]));
		sums.waiting += (Date.now() / 1000 - now);
	}

	var updateFlagsStoreButton = $("<button>").addClass(["btn", "btn-success"]).text("Speichern").click(function () {
		var flags = updateFlagsPanel.find(".btn-outline-dark").map((_i, btn) => $(btn).data("color")).get();
		socket.send({"_m": "examinee_flags", "i": e_id, "flags": flags});
		updateFlagsStoreButton.hide();
	}).hide();

	var updateFlagsPanel = $("<div>").addClass("mb-3").append(flag_colors.map(function (color) {
		return $("<button>").attr("type", "button").addClass("btn").data("color", color).css("color", color).toggleClass("btn-outline-dark", data.examinees[e_id].flags.indexOf(color) >= 0).append(circle.clone()).click(function () {
			$(this).toggleClass("btn-outline-dark", ! $(this).hasClass("btn-outline-dark"));
			updateFlagsStoreButton.show();
		});
	})).append(updateFlagsStoreButton);

	modal.elem.find(".modal-body").append([
		$("<p>").text(currentAssignmentText),
		updateFlagsPanel.toggle(user && user.role == "operator"),
		$("<h5>").text("Offene Stationen"),
		$("<div>").addClass("table-responsive").append(
			$("<table>").addClass(["table", "table-striped"]).append([
				$("<thead>").append(
					$("<tr>").append([
						$("<th>").text("Station"),
						$("<th>").addClass("text-end").text("⌀ Dauer [min]"),
					])
				),
				$("<tbody>").append(
					missingStations.map(function (s_id) {
						var stationCell = $("<td>").append($("<a>").attr("href", "#").text(data.stations[s_id].name).click(function (e) {
							e.preventDefault();
							_openStationModal(s_id);
						}));
						if (currentAssignment !== null && currentAssignment.station == s_id) {
							stationCell.append(" (aktuell an Station)");
						}

						return $("<tr>").append([
							stationCell,
							$("<td>").addClass("text-end").text(stationTimes[s_id] === null ? "unbekannt" : Math.round(stationTimes[s_id] / 60)),
						]);
					})
				),
				$("<tfoot>").append([
					$("<tr>").toggle(missingStations.length == 0).append([
						$("<th>").attr("colspan", 2).text("(keine Stationen offen)")
					]),
					$("<tr>").toggle(missingStations.length > 0).append([
						$("<th>").text("Gesamt"),
						$("<th>").addClass("text-end").text(Math.round(missingStations.reduce((sum, s_id) => sum + (stationTimes[s_id] === null ? 0 : stationTimes[s_id]), 0) / 60))
					]),
					$("<tr>").toggle(missingStations.length > 0).append([
						$("<th>").text("Schätzung für Prüfling"),
						$("<th>").addClass("text-end").text(Math.round(Examinee.calculateRemainingTime(e_id) / 60))
					]),
				]),
			]),
		),
		$("<h5>").text("Historie"),
		$("<div>").addClass("table-responsive").append(
			$("<table>").addClass(["table", "table-striped"]).append([
				$("<thead>").append(
					$("<tr>").append([
						$("<th>").text("Station"),
						$("<th>").addClass("text-end").text("Wartezeit [min]"),
						$("<th>").addClass("text-end").text("Dauer [min]"),
					])
				),
				$("<tbody>").append(assignmentEntries),
				$("<tfoot>").append(
					$("<tr>").toggle(assignmentEntries.length == 0).append(
						$("<th>").attr("colspan", 3).text("(Leer)")
					),
					$("<tr>").toggle(assignmentEntries.length > 0).append([
						$("<th>").text("Summe"),
						$("<td>").addClass("text-end").text(Math.round(sums.waiting / 60)),
						$("<td>").addClass("text-end").text(Math.round(sums.station / 60)),
					])
				),
			]),
		),
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
	var modal = new Modal("Station " + (s_id.startsWith("_") ? fixedStations[s_id].name : data.stations[s_id].name));

	var missingExaminees = Object.keys(data.examinees);
	var currentExaminees = [];
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
			} else if (assignment.result == "open") {
				currentExaminees.push(assignment.examinee);
			}
		}
	}

	modal.elem.find(".modal-body").append([
		$("<p>").text("Hier kann die Auslastung einer Station eingesehen werden."),
		$("<h5>").text("Offene Prüflinge"),
		$("<div>").addClass("table-responsive").append(
			$("<table>").addClass(["table", "table-striped"]).append([
				$("<thead>").append(
					$("<tr>").append([
						$("<th>").text("Prüfling"),
					])
				),
				$("<tbody>").append(
					missingExaminees.map(function (e_id) {
						var cell = $("<td>").addClass("text-truncate");
						cell.append($("<a>").attr("href", "#").text(data.examinees[e_id].name).click(function (e) {
							e.preventDefault();
							_openExamineeModal(e_id);
						}));

						if (currentExaminees.indexOf(e_id) >= 0) {
							cell.append(" (aktuell an Station)");
						}

						return $("<tr>").append(cell);
					})
				),
				$("<tfoot>").toggle(missingExaminees.length == 0).append(
					$("<tr>").append($("<th>").text("(Keine Prüflinge mehr offen)")),
				),
			]),
		),
		$("<h5>").text("Historie"),
		$("<div>").addClass("table-responsive").append(
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

						var name = $("<span>").append(
							$("<a>").addClass("text-truncate").text(data.examinees[assignment.examinee].name).attr("href", "#").click(function (e) {
								e.preventDefault();
								_openAssignmentModal(assignment.i);
							}),
						);
						if (assignment.result == "canceled") {
							name.addClass("fst-italic");
							name.append(" (abgebrochen)");
						}
						name.toggleClass("fw-bold", assignment.result == "open");
						return $("<tr>").toggleClass("fw-bold", assignment.result == "open").append([
							$("<td>").append(name),
							$("<td>").addClass("text-end").append(duration)
						]);
					})
				),
				$("<tfoot>").append(
					$("<tr>").toggle(assignments.length == 0).append(
						$("<th>").attr("colspan", 2).text("(Leer)")
					),
					$("<tr>").toggle(assignments.length > 0).append([
						$("<th>").text("Durchschnitt"),
						$("<th>").addClass("text-end").text(durationCount == 0 ? "unbekannt" : Math.round((durationSum / durationCount) / 60)),
					])
				),
			]),
		),
	]);

	modal.elem.find(".modal-footer").append([
		$("<button>").addClass(["btn", "btn-info"]).toggle(s_id !== "_pause").text("Vorschau").click(function (e) {
			e.preventDefault();

			var print = new PrintOutput();
			print.setOrientation(s_id == "_theorie" ? "landscape" : "portrait");
			print.write("<div style=\"page-break-after:right;\">" + _generatePage({"i": "----", "station": s_id}) + "</div>");
			print.print();
		}),
		$("<button>").addClass(["btn", "btn-danger"]).toggle(!s_id.startsWith("_") && user.role == "admin").text("Löschen").click(function (e) {
			e.preventDefault();

			if (confirm("Achtung, das Löschen einer Station ist nicht umkehrbar und entfernt alle Zuweisungen!")) {
				socket.send({"_m": "station_delete", "i": s_id});
				modal.close();
			}
		}),
		$("<button>").addClass(["btn", "btn-warning"]).toggle(!s_id.startsWith("_") && user.role == "admin").text("Bearbeiten").click(function (e) {
			e.preventDefault();

			_openStationEditModal(s_id);
		}),
	]);

	modal.show();
}

function _openAssignmentModal(a_id) {
	var modal = new Modal("Zuweisung");
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
						assignment.station.startsWith("_") ? fixedStations[assignment.station].name : $("<a>").attr("href", "#").text(data.stations[assignment.station].name).click(function (e) {
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

function _generateStation(i) {
	var name = i.startsWith("_") ? fixedStations[i].name : data.stations[i].name + " (" + data.stations[i].name_pdf + ")";
	var elem;
	var assignButton = $("<button>").addClass(["btn", "btn-success", "assign-examinee"]).text("Zuweisen").click(function (e) {
		e.preventDefault();

		var modal = new Modal("Prüflinge zuweisen");

		function _submit(e) {
			e.preventDefault();

			var autoEnd = modal.elem.find("#minutes").val();
			if (autoEnd <= 0) {
				autoEnd = null;
			} else {
				autoEnd = autoEnd * 60;
			}

			var assignments = modal.elem.find("#examinees").find("option:selected").map(function (_i, elem) {
				var assignment = {"i": _gen_id(), "station": i, "examinee": $(elem).val()}
				if (autoEnd !== null) {
					assignment["autoEnd"] = autoEnd;
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
			var print = new PrintOutput();
			if (i === "_pause") {
				print.setOrientation("portrait");
				print.write("<h2>Pausenankündigung</h2>");
				print.write("<p>Beginn: <strong>" + formatTimestamp(Date.now() / 1000) + "</strong></p>");
				if (autoEnd !== null) {
					print.write("<p>Ende: <strong>" + formatTimestamp((Date.now() / 1000) + autoEnd) + "</strong></p>");
				}
				print.write("<table style=\"width: 100%;border-collapse:collapse;\">");
				print.write("<thead><tr>");
				print.write("<th scope=\"row\" style=\"text-align:left;\">Prüfling</th>");
				print.write("<th scope=\"row\" style=\"width:15%;\">Abgeholt</th>");
				print.write("<th scope=\"row\" style=\"width:15%;\">Ausgegeben</th>");
				print.write("</tr></thead><tbody>");
				for (var assignment of assignments) {
					print.write("<tr style=\"height:3em; border-top:1px solid black;\">");
					print.write("<th style=\"vertical-align:center; text-align:left;\" scope=\"row\">" + data.examinees[assignment.examinee].name + "</th>");
					print.write("<td style=\"border-left:1px dotted black;\">&nbsp;</td>");
					print.write("<td style=\"border-left:1px dotted black;\">&nbsp;</td>");
					print.write("</tr>");
				}
				print.write("</tbody></table>");
			} else {
				print.setOrientation(i == "_theorie" ? "landscape" : "portrait");
				for (var assignment of assignments) {
					print.write("<div style=\"page-break-after:right;\">" + _generatePage(assignment) + "</div>");
				}
			}
			print.print();
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
			$("<form>").append([
				$("<div>").addClass("mb-3").append([
					$("<label>").attr("for", "minutes").addClass("col-form-label").text("Automatisches Ende"),
					$("<input>").attr("type", "number").addClass("form-control").attr("id", "minutes").val(i === "_pause" ? 30 : 0)
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

	const capacity = i.startsWith("_") ? null : ("capacity" in data.stations[i] ? data.stations[i].capacity : 1);
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
						$("<div>").addClass(["progress-bar", "bg-danger"]).css("width", (examinees.length / Object.keys(data.examinees).length) * 100 + "%").text(examinees.length > 0 ? examinees.length : ""),
						$("<div>").addClass(["progress-bar", "bg-secondary"]).css("width", ((Object.keys(data.examinees).length - assignmentsFinished - assignments.length - examinees.length) / Object.keys(data.examinees).length) * 100 + "%").text(Object.keys(data.examinees).length > assignmentsFinished + assignments.length + examinees.length ? Object.keys(data.examinees).length - assignmentsFinished - assignments.length - examinees.length : ""),
					])
				),
				$("<li>").addClass("list-group-item").append([
					$("<span>").addClass("float-end").text(end === null ? "unbekannt" : formatTimestamp(end)),
					$("<span>").text("Abschluss"),
				]),
			]).append(assignments.map(function (a_id) {
				return _buildExamineeItem(data.assignments[a_id].examinee, a_id);
			})).append(
				(i.startsWith("_") || capacity < assignments.length) ? [] : Array.from(Array(capacity - assignments.length)).map(function (_, j) {
					return $("<li>").addClass("list-group-item").toggleClass(["text-danger", "fw-bold"], examinees.length > j).toggleClass("text-muted", examinees.length <= j).text("(Unbesetzt)")
				})
			),
			$("<div>").addClass("card-footer").append([
				i.startsWith("_") ? "" : $("<div>").addClass("btn-group").toggle(user && user.role == "operator").append([
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
			if (assignment.result == "done" && !assignment.station.startsWith("_")) {
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
			if (assignment.result == "done" && assignment.end !== null && !assignment.station.startsWith("_")) {
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
	var header = $("<div>");
	var body = $("<div>");

	var examinee_name = assignment.examinee === undefined ? "OTST (Vorschau) (Vorschau)" : data.examinees[assignment.examinee].name;

	if (assignment.station === "_theorie") {
		const now = new Date();
		const cell_style = {"border": "1px solid black", "padding": "2pt", "min-width": "1.5em"};

		body.css("font-family", "Arial, sans-serif");

		var table = $("<table>").css({"width": "100%", "border-collapse": "collapse", "border": "3px solid black"});
		table.append($("<tr>").append($("<th>").attr("colspan", 48).css({"white-space": "pre", "font-size": "18pt", "border-bottom": "1px solid black"}).text("Grundausbildung im Technischen Hilfswerk\nAuswertungsbogen Abschlussprüfung")));
		table.append($("<tr>").append([
			$("<th>").attr("colspan", 16).attr("rowspan", 2).css({"white-space": "pre", "border": "1px solid black"}).text("Bundesanstalt\nTechnisches Hilfswerk\n\nHERPSL"),
			$("<th>").attr("colspan", 7).css({"text-align": "left", "border": "1px solid black"}).text("Name:"),
			$("<th>").attr("colspan", 10).css({"text-align": "left", "border": "1px solid black"}).text(" "),
			$("<th>").attr("colspan", 5).css({"text-align": "left", "border": "1px solid black"}).text("OV:"),
			$("<th>").attr("colspan", 10).css({"text-align": "left", "border": "1px solid black"}).text(" "),
		]));
		table.append($("<tr>").append([
			$("<th>").attr("colspan", 7).css({"text-align": "left", "border": "1px solid black"}).text("Vorname:"),
			$("<th>").attr("colspan", 10).css({"text-align": "left", "border": "1px solid black"}).text(" "),
			$("<th>").attr("colspan", 5).css({"text-align": "left", "border": "1px solid black"}).text("Geb. Datum:"),
			$("<th>").attr("colspan", 10).css({"text-align": "left", "border": "1px solid black"}).text(" "),
		]));
		table.append($("<tr>").append($("<td>").attr("colspan", 48).css({"border-top": "3px solid black"}).html("&nbsp;")));
		table.append($("<tr>").append([
			$("<th>").attr("colspan", 12).css({"text-align": "left"}).text("Theoretischer Prüfungsteil"),
			$("<th>").attr("colspan", 4).css({"border": "1px solid black"}).text("Serie"),
			$("<th>").attr("colspan", 2).css({"border": "1px solid black"}).text(data.serie_id),
			$("<th>").attr("colspan", 5).text(" "),
			$("<th>").attr("colspan", 25).css({"text-align": "left", "white-space": "pre"}).text("Erste-Hilfe-Bescheinigung lag - nicht - vor.**\nVerschwiegenheitserklärung Sprechfunk lag - nicht - vor.**"),
		]));
		table.append($("<tr>").append(Array.from(Array(48)).map(function (_, j) {return $("<td>").css({"width": j < 47 ? "2.1%" : ""}).html("&nbsp;");})));

		table.append($("<tr>")
			.append($("<td>").attr("colspan", 2).text(" "))
			.append(Array.from(Array(40)).map(function (_, j) {return $("<th>").css("border", "1px solid black").text(j + 1);}))
			.append($("<td>").attr("colspan", 6).text(" "))
		);
		table.append($("<tr>")
			.append($("<th>").attr("colspan", 2).css("border", "1px solid black").text("A"))
			.append(Array.from(Array(40)).map(function (_, j) {return $("<th>").css("border", "1px solid black").text(" ");}))
			.append($("<td>").attr("colspan", 6).text(" "))
		);
		table.append($("<tr>")
			.append($("<th>").attr("colspan", 2).css("border", "1px solid black").text("B"))
			.append(Array.from(Array(40)).map(function (_, j) {return $("<th>").css("border", "1px solid black").text(" ");}))
			.append($("<td>").attr("colspan", 6).text(" "))
		);
		table.append($("<tr>")
			.append($("<th>").attr("colspan", 2).css("border", "1px solid black").text("C"))
			.append(Array.from(Array(40)).map(function (_, j) {return $("<th>").css("border", "1px solid black").text(" ");}))
			.append($("<td>").attr("colspan", 6).text("Summe:"))
		);
		table.append($("<tr>")
			.append($("<th>").css("border", "1px solid black").text("✓"))
			.append($("<th>").css("border", "1px solid black").text("–"))
			.append(Array.from(Array(40)).map(function (_, j) {return $("<th>").css("border", "1px solid black").text(" ");}))
			.append($("<td>").attr("colspan", 6).css("border", "1px solid black").text(" "))
		);

		table.append($("<tr>").append([
			$("<td>").attr("colspan", 4).text("✓ = richtig"),
			$("<td>").attr("colspan", 4).text("– = falsch"),
			$("<td>").attr("colspan", 40).text(" "),
		]));
		table.append($("<tr>").append($("<td>").attr("colspan", 48).css("white-space", "pre").text("Die schriftliche Prüfung ist bestanden, wenn mindestens 32 Fragen richtig beantwortet wurden.\nDer Helfer hat die theoretische Prüfung - nicht - bestanden.**")));
		table.append($("<tr>").append($("<td>").css({"border-bottom": "3px dashed black", "white-space": "pre"}).attr("colspan", 48).html("&nbsp;")));
		table.append($("<tr>").append($("<td>").attr("colspan", 48).html("&nbsp;")));
		table.append($("<tr>").append([
			$("<th>").attr("colspan", 12).css({"text-align": "left"}).text("Praktischer Prüfungsteil"),
			$("<th>").attr("colspan", 4).css({"border": "1px solid black"}).text("Serie"),
			$("<th>").attr("colspan", 2).css({"border": "1px solid black"}).text(data.serie_id),
			$("<th>").attr("colspan", 30).css({"text-align": "left", "white-space": "pre"}).text(" \n "),
		]));
		table.append($("<tr>").append($("<td>").attr("colspan", 48).html("&nbsp;")));

		table.append($("<tr>")
			.append($("<td>").attr("colspan", 4).text(" "))
			.append(Array.from(Array(24)).map(function (_, j) {return $("<th>").css("border", "1px solid black").text(j + 1);}))
			.append($("<td>").attr("colspan", 20).text("Summe:"))
		);
		table.append($("<tr>")
			.append($("<th>").attr("colspan", 3).css({"border": "1px solid black", "border-right": "0px"}).text("richtig"))
			.append($("<th>").css({"border": "1px solid black", "border-left": "0px"}).text("✓"))
			.append(Array.from(Array(24)).map(function (_, j) {return $("<th>").css("border", "1px solid black").text(" ");}))
			.append($("<td>").attr("colspan", 4).css("border", "1px solid black").text(" "))
			.append($("<td>").attr("colspan", 16).text(" "))
		);
		table.append($("<tr>")
			.append($("<th>").attr("colspan", 3).css({"border": "1px solid black", "border-right": "0px"}).text("falsch"))
			.append($("<th>").css({"border": "1px solid black", "border-left": "0px"}).text("–"))
			.append(Array.from(Array(24)).map(function (_, j) {return $("<th>").css("border", "1px solid black").text(" ");}))
			.append($("<td>").attr("colspan", 20).text(" "))
		);
		table.append($("<tr>").append($("<td>").attr("colspan", 48).css("white-space", "pre").text("Die praktische Prüfung ist bestanden, wenn mindestens 19 Aufgaben richtig gelöst wurden.\nDer Helfer hat die praktische Prüfung - nicht - bestanden.**")));
		table.append($("<tr>").append($("<td>").attr("colspan", 48).html("&nbsp;")));
		table.append($("<tr>").append([
			$("<td>").attr("colspan", 4).text("Ort"),
			$("<td>").attr("colspan", 8).css("border-bottom", "1px solid black").text(data.ort),
			$("<td>").attr("colspan", 5).css({"text-align": "right", "padding-right": "1em"}).text("Datum"),
			$("<td>").attr("colspan", 8).css("border-bottom", "1px solid black").text(formatNumber(now.getDate()) + "." + formatNumber(now.getMonth() + 1) + "." + now.getFullYear()),
			$("<td>").attr("colspan", 8).css({"text-align": "right", "padding-right": "1em"}).text("Prüfungsleiter:"),
			$("<td>").attr("colspan", 13).css("border-bottom", "1px solid black").text(" "),
			$("<td>").attr("colspan", 2).text(" "),
		]));
		table.append($("<tr>").append([
			$("<td>").attr("colspan", 33).text(" "),
			$("<td>").attr("colspan", 13).css("text-align", "center").text(data.pruefungsleiter),
			$("<td>").attr("colspan", 2).text(" "),
		]));
		body.append(table);

		body.append($("<p>").html("&nbsp;"));
		body.append($("<p>").css("text-align", "center").html("** Nichtzutreffendes streichen"));
	} else {
		var code = BARCode({"msg": "A-" + assignment.i, "dim": [200, 80]});
		var codeContainer = document.createElement("div");
		codeContainer.appendChild(code);
		var barcode = "data:image/svg+xml;base64," + window.btoa(codeContainer.innerHTML);

		var start = Date.now() / 1000;

		header.append($("<table>").attr("width", "100%").append([
			$("<tr>").append([
				$("<th>").attr("width", "30%").text("Station"),
				$("<td>").css("overflow-wrap", "anywhere").attr("width", "40%").text(data.stations[assignment.station].name_pdf || data.stations[assignment.station].name),
				$("<td>").attr("rowspan", "4").css("text-align", "center").append([
					$("<img>").attr("src", barcode),
					$("<div>").text("A-" + assignment.i)
				])
			]),
			$("<tr>").append([
				$("<th>").text("Prüfling"),
				$("<td>").css("overflow-wrap", "anywhere").text(examinee_name),
			]),
			$("<tr>").append([
				$("<th>").text("Startzeit"),
				$("<td>").text(formatTimestamp(start)),
			]),
			$("<tr>").append([
				$("<th>").text("Prüfer*in (Name und Unterschrift)"),
				$("<td>").text("_".repeat(25)),
			]),
		]));

		header.append($("<p>").html("Bitte setze für jeden Prüfungspunkt in das zugehörige Feld einen Haken (✓) für erfüllte Punkte oder ein Strich (—) für nicht erfüllte Punkte."));

		body.css("columns", "2 auto");

		for (var task of data.stations[assignment.station].tasks) {
			body.append($("<div>").css("padding", "10px").css("break-inside", "avoid").append([
				$("<table>").css("width", "100%").css("border", "1px dotted black").css("border-collapse", "collapse").append([
					$("<tr>").append([
						$("<th>").css("text-align","left").attr("colspan", 2).text(task.name)
					]),
					$("<tr>").css("border-bottom", "1px dotted black").append([
						$("<th>").attr("width", "80%").attr("colspan", 2).css("text-align", "right").text((task.min_tasks || task.parts.length) + " von " + task.parts.length),
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
						$("<td>").attr("width", "70%").text(part.name),
						$("<td>").append(field.clone()),
					]);
				})).append((task.notes || []).map(function (note) {
					return $("<tr>").append([
						$("<td>").attr("colspan", 2).css("font-weight", "bold").css("font-style", "italic").text(note)
					]);
				}))
			]));
		}
	}

	var page = $("<div>");

	page.append($("<table>").css("width", "100%").append([
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

function PrintOutput() {
	var frame_id = "print-" + _gen_id();
	this.frame_id = frame_id;
	$("body").append($("<iframe>").addClass("d-none").attr("id", frame_id).attr("name", frame_id));

	this.write = function (content) {
		window.frames[frame_id].document.write(content);
	};
	this.print = function () {
		window.frames[frame_id].document.close();
		setTimeout(function () {
			window.frames[frame_id].print();
			$("#" + frame_id).remove();
		}, 0);
	};
	this.setOrientation = function (orientation) {
		this.write("<head><style type=\"text/css\">@page { size: A4 " + orientation + "; margin: 0.5cm; } body { font-family:\"Times New Roman\", Times, serif; font-size: 11pt; }</style></head>");
	};
}

function Modal(title) {
	var wrap = _buildModal(title);
	var _elem = $(wrap);

	this._bsModal = bootstrap.Modal.getOrCreateInstance(wrap);
	this.elem = _elem;
	this.show = function () {
		this._bsModal.show();
	}
	this.close = function () {
		this._bsModal.hide();
	}

	$("body").append(_elem);
	_elem.on("hidden.bs.modal", function () {
		_elem.remove();
	});
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

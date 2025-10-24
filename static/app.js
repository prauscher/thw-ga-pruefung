var data = {};
var user = null;
// Default colors
var flag_colors = ["#007bff", "#dc3545", "#ffc107", "#28a745"];
const fixedStations = {
	"_theorie": {"name": "Theorie"},
	"_pause": {"name": "Mittagspause"},
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

const snd_beep_success = new Audio("data:audio/mpeg;base64,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VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/70mQAD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vSZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=");
const snd_beep_error = new Audio("data:audio/mpeg;base64,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9VEOuf6e5sDD2zLtbKxJd37bMBMhSA9tQYQJj9MPwIUnqD62H4CZBpDVQBhBr+tNQKI3+gOo6jMI0OojMZhqEaxGhGahuEaxGcdB1EZ1DSMwziMiMjp4zjpGYRr+mLWC1f+I8SH//8FpTEFNRTMuMTAwqqqqqqqqOAKjT4G1jWXMI07MwEwJJNEVMWdQ7JVokGSkPFKAu40IGiUDL4uS7BaZD82PGiluVcGEicYEGYkhFTLYeWuoEmRbR9WUj9D6PJcFB522WxFnMOyxYaJsxeyLQE06Is+TqoY62BFZp1twYOa08apnW3Mw7KnpWLIDGK3tLriCeGIkojJsxd8eQJCaFNVtTlSSmHsXFYnFUwEYvFrtMXP7ZtOawDY/BFUtTE5tb1atPMu1OT3Hus8ytqyewdCYnvSyeplrLtasxWqcnpypXeme2a5CY0+TKuTM1rWtrat637W1rW+anJiusuXWuJKEJTD0//PkZPAgMfDyB2cMXq6DLeQAykt0zMzpivJJ6tdBRXQUFd/QUFBW7GGscbQVFEnTFIUrchJVXy8SyLBC4SSRfVGlCct0s8h3RJS3NAkLpDTSuWYoKr6U2WGQlL+Uxhxnym0bUxZqypxpK11uratKadds3HakbhNefqaS54El1zMqCwaLgBPFhUi1ChySxCS0REywWPhV6GBE+iI0AVGGWc9SLAGMAkJpSlJoUrua/KkqyKKrKyJEuSpY0qyi3xismz1UOS39VDGNSlH3ERAoSAwior9ZhEVN//qxSB4Hf+IqTEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//PkZAAAAAGkAAAAAAAAA0gAAAAATEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqTEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");

const scannerChars = {173: "-", 13: "", 16: ""};
const assignment_states = {"open": "Aktiv", "done": "Abgeschlossen", "canceled": "Abgebrochen"};

var socket = null;
var assignment_return_waiting = null;

function _gen_id() {
	var S4 = function() {
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	};
	return S4() + S4();
}

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
		}, 500);
	});
});

$(document).on("onbarcodescanned", function (e, code) {
	if (code.startsWith("A-")) {
		const a_id = code.substring(2).toLowerCase();
		const assignment = data.assignments[a_id];
		// Automate return, but only for open assignments, which started at least 5 minutes ago
		if (user.role == "operator-return") {
			if (assignment.result == "open" && assignment.start < socket.time() - 5 * 60) {
				socket.send({"_m": "return", "i": a_id, "result": "done"});
				assignment_return_waiting = [a_id, setTimeout(function () {
					snd_beep_error.play();
					assignment_return_waiting = null;
				}, 5000)];
				return;
			}
			snd_beep_error.play();
		}
		_openAssignmentModal(a_id);
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
				// notiy about success
				if (assignment_return_waiting !== null && msg.i == assignment_return_waiting[0] && msg.result == "done") {
					clearTimeout(assignment_return_waiting[1]);
					assignment_return_waiting = null;
					snd_beep_success.play();
				}
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

	// Rerender periodically to update locked examinees
	setInterval(render, 10000);

	$("#export").click(function () {
		var csvContent = "data:text/csv;charset=utf-8,";

		csvContent += "Prüfling,Station,Prüfer,Ergebnis,Start,Ende,Dauer\r\n";
		for (var a_id of Object.keys(data.assignments)) {
			const assignment = data.assignments[a_id];
			csvContent += '"' + data.examinees[assignment.examinee].name.replace('"', '""') + '",';
			csvContent += '"' + (assignment.station.startsWith("_") ? fixedStations[assignment.station].name : data.stations[assignment.station].name).replace('"', '""') + '",';
			csvContent += '"' + ("examiner" in assignment ? assignment.examiner : "").replace('"', '""') + '",';
			csvContent += '"' + assignment_states[assignment.result] + '",';
			csvContent += '"' + formatTimestamp(assignment.start) + '",';
			csvContent += '"' + (assignment.end === null ? "" : formatTimestamp(assignment.end)) + '",';
			csvContent += '"' + (assignment.end === null ? "" : Math.round((assignment.end - assignment.start) / 60)) + '"\r\n';
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
		const now = new Date(socket.time() * 1000);
		$("#clock").text(formatNumber(now.getHours()) + ":" + formatNumber(now.getMinutes()));
		$(".best-before").each(function (_i, elem) {
			formatBestBefore($(elem));
		});
	}, 1000);

	$.get({
		url: "/static/aufgaben.json?t=" + Date.now(),
		success: function (data) {
			aufgaben = data;
		},
		dataType: "json",
	});
});

function formatNumber(number) {
	return (number < 10 ? "0" : "") + number;
}

function convertRoman(num) {
	if (num < 1) return "";
	if (num >= 40) return "XL" + convertRoman(num - 40);
	if (num >= 10) return "X" + convertRoman(num - 10);
	if (num >= 9) return "IX" + convertRoman(num - 9);
	if (num >= 5) return "V" + convertRoman(num - 5);
	if (num >= 4) return "IV" + convertRoman(num - 4);
	if (num >= 1) return "I" + convertRoman(num - 1);
}

var wizardModal = null;

function showWizard() {
	// wait until aufgaben is filled from remote
	if (aufgaben == null) {
		setTimeout(showWizard, 100);
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
				"print_lfd": "print_lfd" in serie ? serie.print_lfd : serie.lfd,
				"name": "#" + serie.lfd + ": " + task.name,
				"min_tasks": task.min_tasks,
				"parts": task.parts,
				"notes": task.notes,
			});
			serien[serie.serie].stations[serie.station].sort((a, b) => a.print_lfd - b.print_lfd);
		}
	}

	// need to show modal, possibly with message
	wizardModal = new Modal("Willkommen");

	var buttons = [];

	for (const [serie, data] of Object.entries(serien)) {
		buttons.push($("<button>").attr("type", "button").addClass(["btn", "btn-primary", "d-block", "mb-2"]).text("Serie " + serie).click(function (e) {
			e.preventDefault();

			socket.send({"_m": "set_global_settings", "serie_id": serie});

			for (const [station_name, tasks] of Object.entries(data.stations)) {
				var names = station_name.split(" ");
				const pdf_name = convertRoman(names[0]);
				socket.send({"_m": "station", "i": _gen_id(), "name": station_name, "name_pdf": pdf_name, "tasks": tasks});
			}

			wizardModal.close();
		}));
	}

	wizardModal.elem.find(".modal-body").append([
		$("<p>").text("Bisher wurden keine Stationen angelegt. Hier kannst du direkt eine Prüfungsserie laden, um schneller starten zu können. Wenn du ohne vorbereitete Prüfungsserie starten möchtest, schließe dieses Popup einfach wieder."),
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
				socket.send({"_m": "examinee", "i": e_id === null ? _gen_id() : e_id, "name": name, "priority": modal.elem.find("#priority").val(), "locked": modal.elem.find("#locked").val(), "flags": flags});
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
		$("<p>").text("Prüflinge werden primär anhand ihres Namens verwaltet. Dieses Formular erlaubt es, einen oder mehrere Prüflinge anzulegen. Die Prüflinge müssen dabei mit einem Namen und OV pro Zeile angegeben werden (z.B. ODAR Markus Kaup). Eine höhere Priorität verschafft Prüflingen einen virtuellen Zeitvorsprung, damit ihre Prüfung früher beendet wird (z.B. für Jugend-Goldabzeichen). Prüflinge können für die Zuteilung gesperrt angelegt werden, um Zuteilungen zu verhindern, z.B. zur Koordination der Anmeldung. Ein Sperrwert von 0 gibt den Prüfling frei, der Wert -1 sperrt den Prüfling bis zur manuellen Freigabe. Ein Wert über 0 sperrt den Prüfling für die angegebene Minutenanzahl:"),
		$("<form>").append([
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "priority").addClass("col-form-label").text("Priorität"),
				$("<input>").attr("type", "number").addClass("form-control").attr("id", "priority").val(e_id === null ? "100" : data.examinees[e_id].priority)
			]),
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "locked").addClass("col-form-label").text("Sperrwert"),
				$("<input>").attr("type", "number").addClass("form-control").attr("id", "locked").val(e_id === null ? "-1" : (data.examinees[e_id].locked > 0 ? (data.examinees[e_id].locked > socket.time() ? Math.round((data.examinees[e_id].locked - socket.time()) / 60) : "0") : data.examinees[e_id].locked))
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
			} else {
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
			return $("<option>").data("preset", _preset).text(task.nr + " " + task.name);
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
	if (Object.keys(data).length == 0) {
		return;
	}

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

	var examineesWaitingReturnTime = Object.fromEntries(examineesWaiting.map((e_id) => [e_id, ("locked" in data.examinees[e_id]) ? data.examinees[e_id].locked : 0]));
	var examineesWaitingMissingStations = Object.fromEntries(examineesWaiting.map((e_id) => [e_id, ["_theorie", ...Object.keys(data.stations)]]));
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
			if (examineesWaitingMissingStations[a].length == 0) {
				return 1;
			}
			if (examineesWaitingMissingStations[b].length == 0) {
				return -1;
			}
		}
		if (examineesWaitingMissingStations[a].indexOf("_theorie") >= 0 && examineesWaitingMissingStations[b].indexOf("_theorie") < 0) {
			return 1;
		}
		if (examineesWaitingMissingStations[a].indexOf("_theorie") < 0 && examineesWaitingMissingStations[b].indexOf("_theorie") >= 0) {
			return -1;
		}
		if (examineesWaitingReturnTime[a] != examineesWaitingReturnTime[b]) {
			// Group unconfirmed users down below
			if (examineeWaitingReturnTime[a] == -1) {
				return 1;
			}
			if (examineeWaitingReturnTime[b] == -1) {
				return -1;
			}
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
		return _buildExamineeItem(e_id, null).toggleClass("text-muted", examineesWaitingMissingStations[e_id].length == 0 || ("locked" in data.examinees[e_id] && (data.examinees[e_id].locked == -1 || data.examinees[e_id].locked > socket.time())));
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
	var node = $("<li>").addClass(["list-group-item", "examinee-" + e_id, "text-truncate"]);
	if (a_id !== false) {
		node.css("cursor", "pointer").click(function () {
			if (a_id !== null) {
				_openAssignmentModal(a_id);
			} else {
				_openExamineeModal(e_id);
			}
		});
	}

	var openFixedStations = Object.keys(fixedStations);
	var openStations = Object.keys(data.stations);
	for (var assignment of Object.values(data.assignments)) {
		if (assignment.examinee == e_id && assignment.result == "done") {
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
	if (openFixedStations.indexOf("_theorie") < 0) {
		state_indicator = "bg-warning";
	}
	if (openFixedStations.indexOf("_pause") < 0) {
		state_indicator = "bg-success";
	}
	if ("locked" in data.examinees[e_id] && (data.examinees[e_id].locked == -1 || data.examinees[e_id].locked > socket.time())) {
		state_indicator = "bg-secondary";
	}
	node.append($("<span>").addClass(["float-start", "badge", "me-1", state_indicator]).text(openStations.length));
	node.append(data.examinees[e_id].name);
	node.append("flags" in data.examinees[e_id] ? data.examinees[e_id].flags.map((color) => $("<span>").css("color", color).append([" ", circle.clone()])) : []);

	var expectedTimeout = null;
	if (a_id !== null && a_id !== false) {
		if (data.assignments[a_id].end !== null) {
			expectedTimeout = data.assignments[a_id].end;
		} else {
			var expectedDuration = Examinee.estimateStationDuration(data.assignments[a_id].examinee, data.assignments[a_id].station);
			if (expectedDuration !== null) {
				expectedTimeout = data.assignments[a_id].start + expectedDuration;
			}
		}

		if (expectedTimeout !== null) {
			node.addClass("best-before").data("best-before", expectedTimeout);
			formatBestBefore(node);
		}
	}

	return node;
}

function formatBestBefore(node) {
	node.toggleClass(["text-danger"], socket.time() > node.data("best-before"));
	node.toggleClass(["fw-bold"], socket.time() - (10 * 60) > node.data("best-before"));
}

function _openExamineeModal(e_id) {
	const examinee = data.examinees[e_id];
	var modal = new Modal("Prüfling " + examinee.name);
	modal.elem.find(".modal-dialog").addClass("modal-lg");

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
	if (currentAssignment === null && "locked" in examinee && examinee.locked == -1) {
		currentAssignmentText = "Der*die Prüfling befindet sich im Bereitstellungsraum und ist bis zur manuellen Freigabe für Zuteilungen gesperrt.";
	} else if (currentAssignment === null && "locked" in examinee && examinee.locked > socket.time()) {
		currentAssignmentText = "Der*die Prüfling befindet sich im Bereitstellungsraum und ist bis " + formatTimestamp(examinee.locked) + " für Zuteilungen gesperrt.";
	} else if (currentAssignment === null) {
		currentAssignmentText = "Der*die Prüfling befindet sich im Bereitstellungsraum und ist Zuteilungsbereit.";
	} else if (currentAssignment.station === "_theorie") {
		currentAssignmentText = "Der*die Prüfling befindet sich seit " + formatTimestamp(currentAssignment.start) + " in der Theorieprüfung";
	} else if (currentAssignment.station === "_pause") {
		currentAssignmentText = "Der*die Prüfling befindet sich bis " + formatTimestamp(currentAssignment.end) + " in Pause";
	} else {
		currentAssignmentText = "Der*die Prüfling befindet sich seit " + formatTimestamp(currentAssignment.start) + " an Station " + data.stations[currentAssignment.station].name + " (" + data.stations[currentAssignment.station].name_pdf + ")";
	}

	var now = firstStart;
	var assignmentEntries = [];
	var sums = {"waiting": 0, "station": 0, "stations_with_avg": 0, "avg_station": 0};
	for (const assignment of assignments) {
		var name = assignment.station.startsWith("_") ? fixedStations[assignment.station].name : data.stations[assignment.station].name;
		if (assignment.result === "canceled") {
			name = name + " (Abgebrochen)";
		}
		var duration = (assignment.end || socket.time()) - assignment.start;
		var usage = 1.0;
		if (!assignment.station.startsWith("_") && stationTimes[assignment.station] != null) {
			usage = duration / stationTimes[assignment.station];
			sums.stations_with_avg += duration;
			sums.avg_station += stationTimes[assignment.station];
		}
		var durationContent = [$("<span>").text(Math.round(duration / 60))];
		if (assignment.result === "done" && !assignment.station.startsWith("_")) {
			durationContent.push($("<br>"));
			durationContent.push($("<span>").toggleClass("text-danger", usage > 1).toggleClass("text-success", usage < 1).text((usage >= 1 ? "+" : "") + Math.round((usage - 1) * 100) + " %"));
		}
		var oldNow = now;
		now = assignment.end;
		if (assignment.result === "open" && assignment.end !== null) {
			durationContent.push($("<br>"));
			durationContent.push($("<span>").addClass("fst-italic").text("noch " + Math.round((now - socket.time()) / 60) + " verbleibend"));
			now = null;
		}
		assignmentEntries.push($("<tr>").append([
			$("<td>").toggleClass("fst-italic", assignment.station.startsWith("_") || assignment.result == "canceled").append(
				$("<a>").attr("href", "#").text(name).click(function (e) {
					e.preventDefault();
					_openAssignmentModal(assignment.i);
				}),
			),
			$("<td>").text("examiner" in assignment ? assignment.examiner : ""),
			$("<td>").addClass("text-end").text(Math.round((assignment.start - oldNow) / 60)),
			$("<td>").addClass("text-end").append(durationContent),
		]));
		sums.waiting += (assignment.start - oldNow);
		sums.station += duration;
	}
	if (now !== null && missingStations.length > 0) {
		assignmentEntries.push($("<tr>").append([
			$("<td>").attr("colspan", 2).addClass("fst-italic").text(" "),
			$("<td>").addClass("text-end").text(Math.round((socket.time() - now) / 60)),
			$("<td>").addClass("text-end").text(" "),
		]));
		sums.waiting += socket.time() - now;
	}

	var lockPanel = $("<div>").addClass("mb-3");
	if ("locked" in examinee && (examinee.locked == -1 || examinee.locked > socket.time())) {
		lockPanel.append($("<button>").addClass(["btn", "btn-primary"]).text("Für Zuteilung freigeben")).click(function () {
			socket.send({"_m": "examinee_lock", "i": e_id, "locked": 0});
			lockPanel.hide();
		});
	} else {
		var lockInput = $("<input>");
		lockPanel.append($("<div>").addClass("input-group").append([
			$("<p>").text("Ein Prüfling kann entweder für einige Minuten oder bis zur manuellen Freigabe für die Zuteilung gesperrt werden. Gebe entweder die Anzahl der Minuten oder -1 für eine unbestimmte Sperrung ein."),
			$("<button>").addClass(["btn", "btn-outline-warning"]).text("Für Zuteilung sperren für").click(function () {
				socket.send({"_m": "examinee_lock", "i": e_id, "locked": lockInput.val()});
				lockPanel.hide();
			}),
			lockInput.attr("type", "number").val("-1").addClass("form-control")
		]));
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
		lockPanel.toggle(user && user.role == "operator"),
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
						$("<th>").text("Prüfer*in"),
						$("<th>").addClass("text-end").text("Wartezeit [min]"),
						$("<th>").addClass("text-end").text("Dauer [min]"),
					])
				),
				$("<tbody>").append(assignmentEntries),
				$("<tfoot>").append(
					$("<tr>").toggle(assignmentEntries.length == 0).append(
						$("<th>").attr("colspan", 4).text("(Leer)")
					),
					$("<tr>").toggle(assignmentEntries.length > 0).append([
						$("<th>").attr("colspan", 2).text("Summe"),
						$("<td>").addClass("text-end").text(Math.round(sums.waiting / 60)),
						$("<td>").addClass("text-end").append($("<span>").text(Math.round(sums.station / 60))).append(sums.avg_station == 0 ? [] : [
							$("<br>"),
							$("<span>").toggleClass("text-danger", sums.stations_with_avg > sums.avg_station).toggleClass("text-success", sums.stations_with_avg <= sums.avg_station).text((sums.stations_with_avg > sums.avg_station ? "+" : "") + Math.round(((sums.stations_with_avg / sums.avg_station) - 1) * 100) + " %"),
						]),
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
	modal.elem.find(".modal-dialog").addClass("modal-lg");

	var tab = new Tab();

	var missingExaminees = Object.keys(data.examinees);
	var currentExaminees = [];
	var assignments = [];
	var durationSum = 0;
	var durationCount = 0;

	var examineeTimes = Object.fromEntries(Object.keys(data.examinees).map((_e_id) => [_e_id, Object.fromEntries(Object.keys(data.stations).map((_s_id) => [_s_id, null]))]));
	var stationTimes = Object.fromEntries(Object.keys(data.stations).map((_s_id) => [_s_id, []]));

	for (const a_id of Object.keys(data.assignments)) {
		const assignment = data.assignments[a_id];

		if (assignment.result == "done" && !assignment.station.startsWith("_")) {
			examineeTimes[assignment.examinee][assignment.station] = assignment;
			stationTimes[assignment.station].push(assignment.end - assignment.start);
		}

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

	stationTimes = Object.fromEntries(Object.entries(stationTimes).map(([_s_id, _times]) => [_s_id, _times.length == 0 ? null : _times.reduce((_c, _v) => _v + _c, 0) / _times.length]));

	if (!s_id.startsWith("_")) {
		var examinerTimes = {};
		for (const e_id of Object.keys(examineeTimes)) {
			const assignment = examineeTimes[e_id][s_id];
			if (assignment === null) {
				continue;
			}

			const duration = (assignment.end - assignment.start) / 60;
			const examiner = ("examiner" in assignment) ? assignment.examiner : "(Unbekannt)";

			var factors = [];
			for (const _s_id of Object.keys(data.stations)) {
				if (examineeTimes[e_id][_s_id] !== null && stationTimes[_s_id] !== null) {
					factors.push((examineeTimes[e_id][_s_id].end - examineeTimes[e_id][_s_id].start) / stationTimes[_s_id]);
				}
			}

			var factor = 1;
			if (factors.length > 0) {
				factor = (factors.reduce((_c, _v) => _v + _c, 0) / factors.length);
			}

			if (!(examiner in examinerTimes)) {
				examinerTimes[examiner] = [];
			}
			examinerTimes[examiner].push({"assignment": assignment, "duration": duration, "factor": factor});
		}

		var chartCanvas = $("<canvas>");
		tab.addPanel("Dauer").panel.append([
			$("<p>").addClass("mt-2").text("Die Übersicht zeigt alle an dieser Station abgeschlossenen Prüfungen. Dabei wird die tatsächliche Zeit in Minuten entlang der X-Achse und die relative Dauer des jeweiligen Prüflings über alle Stationen auf der Y-Achse angezeigt. Die Farbe zeigt den*die angegebenen Prüfer*in an."),
			$("<div>").append([
				chartCanvas.toggle(Object.keys(examinerTimes).length > 0),
				$("<p>").text("Bisher stehen keine Daten zur Verfügung.").toggle(Object.keys(examinerTimes).length == 0),
			]),
		]);

		var chart = new Chart(chartCanvas, {
			"type": "scatter",
			"data": {
				"datasets": Object.keys(examinerTimes).map((examiner) => ({
					"label": examiner,
					"data": examinerTimes[examiner].map((data) => ({"x": data.duration, "y": data.factor, "_assignment": data.assignment})),
				})),
			},
			"options": {
				"scales": {
					"y": {
						"ticks": {
							"callback": (value, index, ticks) => Math.round((value - 1) * 100) + " %",
						},
					},
				},
				"plugins": {
					"tooltip": {
						"callbacks": {
							"label": (ctx) => [
								data.examinees[ctx.raw._assignment.examinee].name,
								"Prüfer: " + ctx.dataset.label,
								"Dauer [min]: " + Math.round(ctx.parsed.x),
							],
						},
					},
				},
			},
		});
		$(chartCanvas)[0].onclick = function (e) {
			const points = chart.getElementsAtEventForMode(e, 'nearest', {intersect: true}, true);
			if (points.length == 0) {
				return;
			}
			const assignment = chart.data.datasets[points[0].datasetIndex].data[points[0].index]._assignment;
			_openAssignmentModal(assignment.i);
		};
	}

	tab.addPanel("Offen").panel.append(
		$("<div>").addClass(["container", "mb-2"]).append($("<div>").addClass("row").append(
			missingExaminees.map(function (e_id) {
				var cell = $("<div>").addClass(["text-truncate", "col-4"]);
				cell.append($("<a>").attr("href", "#").text(data.examinees[e_id].name).click(function (e) {
					e.preventDefault();
					_openExamineeModal(e_id);
				}));

				if (currentExaminees.indexOf(e_id) >= 0) {
					cell.append(" (aktuell an Station)");
				}

				return cell;
			})
		)).append($("<div>").toggle(missingExaminees.length == 0).text("(Keine Prüflinge mehr offen)")),
	);

	tab.addPanel("Historie").panel.append(
		$("<div>").addClass("table-responsive").append(
			$("<table>").addClass(["table", "table-striped"]).append([
				$("<thead>").append(
					$("<tr>").append([
						$("<th>").text("Prüfling"),
						$("<th>").text("Prüfer*in"),
						$("<th>").addClass("text-end").text("Dauer [min]"),
					])
				),
				$("<tbody>").append(
					assignments.map(function (assignment) {
						var duration = [];
						if (assignment.end === null) {
							duration.push($("<span>").text("bisher " + Math.round((socket.time() - assignment.start) / 60)));
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
							$("<td>").append("examiner" in assignment ? assignment.examiner : ""),
							$("<td>").addClass("text-end").append(duration)
						]);
					})
				),
				$("<tfoot>").append(
					$("<tr>").toggle(assignments.length == 0).append(
						$("<th>").attr("colspan", 3).text("(Leer)")
					),
					$("<tr>").toggle(assignments.length > 0).append([
						$("<th>").attr("colspan", 2).text("Durchschnitt"),
						$("<th>").addClass("text-end").text(durationCount == 0 ? "unbekannt" : Math.round((durationSum / durationCount) / 60)),
					])
				),
			]),
		),
	);

	modal.elem.find(".modal-body").append(tab.elem);

	modal.elem.find(".modal-footer").append([
		$("<button>").addClass(["btn", "btn-info"]).toggle(!s_id.startsWith("_")).text("Vorschau").click(function (e) {
			e.preventDefault();

			var print = new PrintOutput();
			print.setOrientation("portrait");
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
		if (assignment.end > socket.time()) {
			ende.push($("<span>").addClass("fst-italic").text(" (noch " + Math.round((assignment.end - socket.time()) / 60) + " min)"));
		} else {
			ende.push($("<span>").addClass("fst-italic").text(" (nach " + Math.round((assignment.end - assignment.start) / 60) + " min)"));
		}
	} else {
		var expectedDuration = Examinee.estimateStationDuration(assignment.examinee, assignment.station);
		if (expectedDuration === null) {
			ende.push($("<span>").addClass(["fst-italic", "text-warning"]).text(" (keine Abschätzung möglich)"));
		} else {
			var estimatedRemaining = assignment.start + expectedDuration - socket.time();
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
					$("<th>").text("Prüfer*in"),
					$("<td>").text("examiner" in assignment ? assignment.examiner : "-"),
				]),
				$("<tr>").append([
					$("<th>").text("Ergebnis"),
					$("<td>").text(assignment_states[assignment.result]),
				]),
				$("<tr>").append([
					$("<th>").text("Anfang"),
					$("<td>").append([
						$("<span>").text(formatTimestamp(assignment.start)),
						$("<span>").addClass("fst-italic").text(" (vor " + Math.round((socket.time() - assignment.start) / 60) + " min)"),
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
		modal.elem.find(".modal-dialog").addClass("modal-lg");

		function _submit(e) {
			e.preventDefault();

			var autoEnd = null;
			var globalExaminer = "";
			var assignments;
			if (i.startsWith("_")) {
				autoEnd = modal.elem.find("#minutes").val();
				if (autoEnd <= 0) {
					autoEnd = null;
				} else {
					autoEnd = autoEnd * 60;
				}

				globalExaminer = modal.elem.find("#examiner").val();

				assignments = modal.elem.find("#examinees").find("option:selected").map(function (_i, elem) {
					var assignment = {"i": _gen_id(), "station": i, "examinee": $(elem).val(), "examiner": globalExaminer};
					if (autoEnd !== null) {
						assignment["autoEnd"] = autoEnd;
					}
					return assignment;
				}).get();
			} else {
				assignments = modal.elem.find(".examiner").map(function (_i, elem) {
					var examiner = $(elem).val();
					if (examiner == "") {
						return null;
					}
					return {"i": _gen_id(), "station": i, "examinee": $(elem).data("e_id"), "examiner": $(elem).val()};
				}).filter((_i, assignment) => assignment !== null).get();
			}

			if (assignments.length == 0) {
				return;
			}

			for (var assignment of assignments) {
				socket.send({"_m": "assign", ...assignment})
			}

			// Open print dialog
			var print = new PrintOutput();
			if (i.startsWith("_")) {
				print.setOrientation("portrait");
				print.write("<h2>" + (i == "_theorie" ? "Zuordnung zur Theorieprüfung" : "Pausenankündigung") + "</h2>");
				print.write("<p>Beginn: <strong>" + formatTimestamp(socket.time()) + "</strong></p>");
				if (autoEnd !== null) {
					print.write("<p>Ende: <strong>" + formatTimestamp(socket.time() + autoEnd) + "</strong></p>");
				}
				if (globalExaminer != "") {
					print.write("<p>Prüfer*in: <strong>" + globalExaminer + "</strong></p>");
				}
				print.write("<table style=\"width: 100%;border-collapse:collapse;\">");
				print.write("<thead><tr>");
				print.write("<th scope=\"row\" style=\"text-align:left;\">Prüfling</th>");
				print.write("<th scope=\"row\" style=\"width:15%;\">Abgeholt</th>");
				print.write("<th scope=\"row\" style=\"width:15%;\">" + (i == "_theorie" ? "Abgeschlossen" : "Ausgegeben") + "</th>");
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
				print.setOrientation("portrait");
				for (var assignment of assignments) {
					print.write("<div style=\"page-break-after:right;\">" + _generatePage(assignment) + "</div>");
				}
			}
			print.print();
			modal.close();
		}

		// Find valid examinees (which must not be locked) and sort by priorities
		var examinees = [];
		for (const examinee_kv of Object.entries(data.examinees)) {
			if ("locked" in examinee_kv[1] && (examinee_kv[1].locked == -1 || examinee_kv[1].locked > socket.time())) {
				continue;
			}
			examinees.push(examinee_kv[0]);
		}
		var activeExaminers = [];
		var examineesTheorieDone = [];
		for (var assignment of Object.values(data.assignments)) {
			if (assignment.result == "done" && assignment.station == "_theorie") {
				examineesTheorieDone.push(assignment.examinee);
			}
			if ((assignment.result == "open") || (assignment.result == "done" && assignment.station == i)) {
				var _i = examinees.indexOf(assignment.examinee);
				if (_i >= 0) {
					examinees.splice(_i, 1);
				}
			}
			if (assignment.station == i && "examiner" in assignment && activeExaminers.indexOf(assignment.examiner) < 0 && (assignment.start > socket.time() - 60 * 60 || assignment.result == "open")) {
				activeExaminers.push(assignment.examiner);
			}
		}
		var examinee_priorities = Object.fromEntries(examinees.map(function (e_id) {
			return [
				e_id,
				data.examinees[e_id].priority + (Examinee.calculateRemainingTime(e_id) / 60) + Math.random()
			];
		}));
		examinees.sort(function (a, b) {
			if (examineesTheorieDone.indexOf(a) >= 0 && examineesTheorieDone.indexOf(b) < 0) {
				return 1;
			}
			if (examineesTheorieDone.indexOf(a) < 0 && examineesTheorieDone.indexOf(b) >= 0) {
				return -1;
			}
			return examinee_priorities[b] - examinee_priorities[a];
		});

		modal.elem.find(".modal-body").append($("<p>").addClass("fw-bold").text("Station " + name));
		if (i.startsWith("_")) {
			var autoEnd = 0;
			if (i === "_pause") {
				autoEnd = 30;
			} else if (i === "_theorie") {
				autoEnd = 60;
			}
			modal.elem.find(".modal-body").append([
				$("<p>").text("Um Prüflinge zuzuweisen, werden ein oder mehrere Prüflinge in der unten stehenden Liste ausgewählt. Diese enthält nur verfügbare Prüflinge und ist sortiert nach Priorität und bereits absolvierten Stationen. Es können mehrere Prüflinge gleichzeitig zugewiesen werden und optional ein automatisches Ende der Zuweisung (z.B. für Pausen) eingestellt werden. Optional kann der Name des*der Prüfer*in hinterlegt werden:"),
				$("<form>").append([
					$("<div>").addClass("mb-3").append([
						$("<label>").attr("for", "minutes").addClass("col-form-label").text("Automatisches Ende"),
						$("<input>").attr("type", "number").addClass("form-control").attr("id", "minutes").val(autoEnd)
					]),
					$("<div>").addClass("mb-3").append([
						$("<label>").attr("for", "examiner").addClass("col-form-label").text("Prüfer*in"),
						$("<input>").attr("type", "text").addClass("form-control").attr("id", "examiner").val("")
					]),
					$("<div>").addClass("mb-3").append([
						$("<label>").attr("for", "examinees").addClass("col-form-label").text("Prüflinge"),
						$("<select>").prop("multiple", true).attr("size", 7).addClass("form-select").attr("id", "examinees").append(
							examinees.map((e_id) => $("<option>").attr("value", e_id).text(data.examinees[e_id].name))),
					]),
				]),
				$("<button>").addClass(["btn", "btn-primary", "float-end"]).text("Zuweisen").click(_submit)
			]);
		} else {
			modal.elem.find(".modal-body").append([
				$("<p>").text("Um Prüflinge zuzuweisen, schreibe den Namen des*der eingeteilten Prüfer*in (z.B. ODAR David Krings) in das Textfeld hinter die jeweiligen Namen. Es werden nur verfügbare Prüflinge angezeigt, die nach Priorität sortiert sind."),
				$("<form>").submit(_submit).append([
					$("<div>").addClass("mb-3").append([
						$("<label>").attr("for", "examinees").addClass("col-form-label").text("Prüflinge"),
						$("<div>").addClass("overflow-auto").css("height", "250px").append(
							$("<ul>").addClass(["list-group", "list-group-flush"]).append(
								examinees.map(function (e_id) {
									var node = _buildExamineeItem(e_id, false);
									var input = $("<input>").attr("type", "text").data("e_id", e_id).attr("autocomplete", "off").addClass(["form-control", "examiner"]);
									node.prepend($("<div>").addClass("float-end").append(input));
									new Autocomplete(input.get(0), {"items": Object.fromEntries(activeExaminers.map((examiner) => [examiner, examiner])), "fixed": true});
									return node;
								})
							),
						),
					]),
					$("<button>").attr("type", "submit").addClass(["btn", "btn-primary", "float-end"]).text("Zuweisen")
				]),
			]);
		}

		modal.elem.find(".modal-footer").remove();
		modal.show();
		modal.elem.on("shown.bs.modal", function () {
			modal.elem.find(".examiner:first").focus();
		});
	});

	var assignments = [];
	var examineesDone = [];
	var lastStartedAssignment = null;
	var lastFinishedAssignment = null;
	var stationTimes = Object.fromEntries(Object.keys(data.stations).map((_s_id) => [_s_id, []]));
	var ownTimes = Object.fromEntries(Object.keys(data.examinees).map((_e_id) => [_e_id, Object.fromEntries(Object.keys(data.stations).map((_s_id) => [_s_id, null]))]));

	for (var a_id of Object.keys(data.assignments)) {
		const assignment = data.assignments[a_id];

		if (assignment.result == "done" && assignment.end !== null && !assignment.station.startsWith("_")) {
			ownTimes[assignment.examinee][assignment.station] = assignment.end - assignment.start;
			stationTimes[assignment.station].push(assignment.end - assignment.start);
		}

		if (assignment.station == i) {
			if (assignment.result == "open") {
				assignments.push(a_id);
				if (lastStartedAssignment === null || assignment.start > lastStartedAssignment) {
					lastStartedAssignment = assignment.start;
				}
			} else if (assignment.result == "done") {
				examineesDone.push(assignment.examinee);
			}
			if (lastFinishedAssignment === null || assignment.end > lastFinishedAssignment) {
				lastFinishedAssignment = assignment.end;
			}
		}
	}

	stationTimes = Object.fromEntries(Object.entries(stationTimes).map(([_s_id, _times]) => [_s_id, _times.length == 0 ? null : _times.reduce((_c, _v) => _v + _c, 0) / _times.length]));

	assignments.sort(function (a_id, b_id) {
		const a = data.assignments[a_id];
		const b = data.assignments[b_id];
		if ("examiner" in a && "examiner" in b) {
			if (a.examiner == b.examiner) {
				return 0;
			} else if (a.examiner < b.examiner) {
				return -1;
			} else if (a.examiner > b.examiner) {
				return 1;
			}
		}
		return b.start - a.start;
	});

	var examinees = [];
	var allExaminers = {};
	var activeExaminers = [];
	for (const examinee_kv of Object.entries(data.examinees)) {
		if ("locked" in examinee_kv[1] && (examinee_kv[1].locked == -1 || examinee_kv[1].locked > socket.time())) {
			continue;
		}
		examinees.push(examinee_kv[0]);
	}
	for (var assignment of Object.values(data.assignments)) {
		if ("examiner" in assignment && assignment.station == i) {
			if (!(assignment.examiner in allExaminers) || assignment.start > allExaminers[assignment.examiner]) {
				allExaminers[assignment.examiner] = assignment.start;
			}
			if (assignment.result == "open" && activeExaminers.indexOf(assignment.examiner) < 0) {
				activeExaminers.push(assignment.examiner);
			}
		}
		if ((assignment.result == "open") || (assignment.result == "done" && assignment.station == i)) {
			var _i = examinees.indexOf(assignment.examinee);
			if (_i >= 0) {
				examinees.splice(_i, 1);
			}
		}
	}

	// Find examiners which were once active, but are no longer, sorted by their last started assignment
	var availableExaminers = Object.entries(allExaminers).filter((kv) => activeExaminers.indexOf(kv[0]) < 0);
	availableExaminers.sort((kv_a, kv_b) => kv_b[1] - kv_a[1]);

	var end = null;
	if (!i.startsWith("_") && examineesDone.length > 0) {
		if (examineesDone.length == Object.keys(data.examinees).length) {
			end = lastFinishedAssignment;
		} else if (lastStartedAssignment !== null && activeExaminers.length > 0) {
			end = lastStartedAssignment + Object.keys(data.examinees).reduce(function (carry, e_id) {
				// Ignore examinees which completed this station
				if (examineesDone.indexOf(e_id) >= 0) {
					return carry;
				}

				var factors = [];
					for (const _s_id of Object.keys(data.stations)) {
					if (ownTimes[e_id][_s_id] !== null && stationTimes[_s_id] !== null) {
						factors.push(ownTimes[e_id][_s_id] / stationTimes[_s_id]);
					}
				}

				var factor = 1;
				if (factors.length > 0) {
					factor = (factors.reduce((_c, _v) => _v + _c, 0) / factors.length);
				}
				return carry + factor;
			}, 0) * stationTimes[i] / activeExaminers.length;
		}
	}

	assignButton.prop("disabled", examinees.length == 0);

	var currentExaminer = "";
	var examinerColors = ["#fff080", "#800080", "#00806c", "#800000", "#004e80"];
	const capacity = i.startsWith("_") ? null : ("capacity" in data.stations[i] ? data.stations[i].capacity : 1);
	elem = $("<div>").addClass("col").append(
		$("<div>").addClass(["card", "station-" + i]).append([
			$("<div>").addClass("card-header").css("cursor", "pointer").text(name).click(function () {
				_openStationModal(i);
			}),
			$("<ul>").addClass(["list-group", "list-group-flush", "examinees"]).append([
				$("<li>").addClass("list-group-item").append(
					$("<div>").addClass(["progress"]).append(Object.keys(data.examinees).length == 0 ? [
						$("<div>").addClass(["progress-bar", "bg-danger"]).css("width", "100%").text(""),
					] : [
						$("<div>").addClass(["progress-bar", "bg-success"]).css("width", (examineesDone.length / Object.keys(data.examinees).length) * 100 + "%").text(examineesDone.length > 0 ? examineesDone.length : ""),
						$("<div>").addClass(["progress-bar", "bg-primary"]).css("width", (assignments.length / Object.keys(data.examinees).length) * 100 + "%").text(assignments.length > 0 ? assignments.length : ""),
						$("<div>").addClass(["progress-bar", "bg-danger"]).css("width", (examinees.length / Object.keys(data.examinees).length) * 100 + "%").text(examinees.length > 0 ? examinees.length : ""),
						$("<div>").addClass(["progress-bar", "bg-secondary"]).css("width", ((Object.keys(data.examinees).length - examineesDone.length - assignments.length - examinees.length) / Object.keys(data.examinees).length) * 100 + "%").text(Object.keys(data.examinees).length > examineesDone.length + assignments.length + examinees.length ? Object.keys(data.examinees).length - examineesDone.length - assignments.length - examinees.length : ""),
					])
				),
				$("<li>").addClass("list-group-item").toggle(!i.startsWith("_")).append([
					$("<span>").addClass(["float-end", "abschluss-value"]).data("timestamp", end).text(end === null ? "unbekannt" : formatTimestamp(end)),
					$("<span>").text("Abschluss"),
				]),
			]).append(assignments.map(function (a_id) {
				var item = _buildExamineeItem(data.assignments[a_id].examinee, a_id);

				if ("examiner" in data.assignments[a_id] && data.assignments[a_id].examiner != "") {
					if (currentExaminer != data.assignments[a_id].examiner) {
						currentExaminer = data.assignments[a_id].examiner;
						examinerColors.push(examinerColors.shift());
						item.append($("<small>").addClass("float-end").text(currentExaminer));
					}
					item.addClass("pe-1");
					item.css("border-right", ".8em solid " + examinerColors[0]);
				}

				return item;
			})).append(
				(i.startsWith("_") || capacity < activeExaminers.length) ? [] : Array.from(Array(capacity - activeExaminers.length)).map(function (_, j) {
					var item = $("<li>").addClass("list-group-item").toggleClass(["text-danger", "fw-bold"], examinees.length > j).toggleClass("text-muted", examinees.length <= j).text("(Unbesetzt)");
					if (j < availableExaminers.length) {
						examinerColors.push(examinerColors.shift());
						item.append($("<small>").addClass("float-end").text(availableExaminers[j][0]));
						item.addClass("pe-1");
						item.css("border-right", ".8em solid " + examinerColors[0]);
					}
					return item;
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

	var examinee_name = assignment.examinee === undefined ? "OTST Harald Schreiber" : data.examinees[assignment.examinee].name;
	var examiner_name = assignment.examiner === undefined ? "OTST Berta Beispiel" : assignment.examiner;

	if (false) {
		// Auswertungsbogen, maybe useful later
		const now = new Date(socket.time() * 1000);
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
			$("<td>").attr("colspan", 8).css("border-bottom", "1px solid black").text("Darmstadt"),
			$("<td>").attr("colspan", 5).css({"text-align": "right", "padding-right": "1em"}).text("Datum"),
			$("<td>").attr("colspan", 8).css("border-bottom", "1px solid black").text(formatNumber(now.getDate()) + "." + formatNumber(now.getMonth() + 1) + "." + now.getFullYear()),
			$("<td>").attr("colspan", 8).css({"text-align": "right", "padding-right": "1em"}).text("Prüfungsleiter:"),
			$("<td>").attr("colspan", 13).css("border-bottom", "1px solid black").text(" "),
			$("<td>").attr("colspan", 2).text(" "),
		]));
		table.append($("<tr>").append([
			$("<td>").attr("colspan", 33).text(" "),
			$("<td>").attr("colspan", 13).css("text-align", "center").text("John Doe"),
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

		var start = socket.time();

		header.append($("<table>").attr("width", "100%").append([
			$("<tr>").append([
				$("<th>").attr("width", "20%").text("Station"),
				$("<td>").css("overflow-wrap", "anywhere").attr("width", "30%").text(data.stations[assignment.station].name_pdf || data.stations[assignment.station].name),
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
				$("<th>").text("Prüfer*in"),
				$("<td>").css("white-space", "pre").text("\n" + "_".repeat(25) + "\n" + examiner_name),
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

function Tab() {
	var tablist = document.createElement('ul');
	tablist.setAttribute('class', 'nav nav-tabs');
	tablist.setAttribute('role', 'tablist');

	var panes = document.createElement('div');
	panes.setAttribute('class', 'tab-content');

	var wrap = document.createElement('div');
	wrap.append(tablist);
	wrap.append(panes);

	this.elem = $(wrap);
	this.addPanel = function (name) {
		var tab_id = "tab-" + (((1+Math.random())*0x10000)|0).toString(16).substring(1);

		var panel = document.createElement('div');
		panel.setAttribute('id', tab_id + '-panel');
		panel.setAttribute('class', 'tab-pane' + (tablist.childElementCount == 0 ? ' active' : ''));
		panel.setAttribute('role', 'tabpanel');

		var button = document.createElement('button');
		button.setAttribute('id', tab_id + '-button');
		button.setAttribute('type', 'button');
		button.setAttribute('class', 'nav-link' + (tablist.childElementCount == 0 ? ' active' : ''));
		button.setAttribute('role', 'tab');
		button.setAttribute('data-bs-toggle', 'tab');
		button.setAttribute('data-bs-target', '#' + tab_id + '-panel');
		button.innerText = name;

		var header = document.createElement('li');
		header.setAttribute('class', 'nav-item');
		header.setAttribute('role', 'presentation');
		header.append(button);

		tablist.append(header);
		panes.append(panel);

		var tabTrigger = new bootstrap.Tab(button);
		button.addEventListener('click', function (event) {
			event.preventDefault();
			tabTrigger.show();
		});

		return  {
			"panel": $(panel),
			"show": function () {
				bootstrap.Tab.getInstance(button).show();
			},
		};
	};
}

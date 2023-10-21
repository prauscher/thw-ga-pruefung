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
		on_login: function () {
			$("#socketIndicator").text("Online").addClass("bg-success").removeClass("bg-danger");
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
					$("<form>").prop("action", "#").on("submit", _submit).append([
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
					$("<form>").prop("action", "#").on("submit", _submit).append([
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
			for (var i in state.examinees) {
				updateExaminee(i, state.examinees[i].name);
			}
		},
		handlers: {
			"station": function (msg) {
				console.log("STATION", msg);
			},
			"examinee": function (msg) {
				updateExaminee(msg.i, msg.name);
			},
		},
	});

	$("#examinee-add").click(function () {
		var modal = Modal("Prüflinge eintragen");

		function _submit(e) {
			e.preventDefault();

			for (var name of modal.elem.find("#names").val().split("\n").values()) {
				name = name.trim();
				if (name != "") {
					socket.send({"_m": "examinee", "i": _gen_id(), "name": name});
				}
			}

			modal.close();
		}

		modal.elem.find(".modal-body").append([
			$("<p>").text("Prüflinge werden primär anhand ihres Namens verwaltet. Dieses Formular erlaubt es, einen oder mehrere Prüflinge anzulegen. Die Prüflinge müssen dabei mit einem Namen pro Zeile angegeben werden:"),
			$("<div>").attr("id", "alerts"),
			$("<form>").prop("action", "#").on("submit", _submit).append([
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
});

function updateExaminee(i, name) {
	// TODO check iff assignments are open
	$("#examinees").append($("<div>").addClass(["card", "mb-1"]).data("e-id", i).append(
		$("<div>").addClass("card-body").append([
			name,
		])));
}

function Modal(title) {
	var wrap = _buildModal(title);
	this.elem = $(wrap);
	$("body").append(this.elem);
	this.bsModal = bootstrap.Modal.getOrCreateInstance(wrap);
	this.show = function() {
		this.bsModal.show();
	}
	this.close = function() {
		this.bsModal.hide();
		wrap.remove()
	}
	return this;
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

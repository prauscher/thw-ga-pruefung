function ReliableWebSocket(options) {
	var speed = 20;
	var paused = true;
	var pos = null;
	var events = [];

	var playButton = $("<button>").addClass(["btn", paused ? "btn-secondary" : "btn-outline-secondary"]).text("Play / Pause").click(function () {
		paused = !paused;
		$(this).toggleClass("btn-secondary", !paused);
		$(this).toggleClass("btn-outline-secondary", paused);

	});
	var timestampLabel = $("<span>");
	$("body").append($("<div>").css({"position": "fixed", "bottom": "1em", "left": "50%", "right": "50%", "margin": "0px -150px", "padding": ".3em", "width": "300px", "background": "#cccccc", "border-radius": ".5em"}).append(
		playButton,
		timestampLabel,
	));

	var modal = new Modal("Prüfungswiederholung");
	const user = {"name": "Replay", "role": "operator"};

	function handle(data) {
		if ("handlers" in options && data._m in options.handlers) {
			options.handlers[data._m](data);
		}
	}

	window.setInterval(function () {
		if (pos === null || paused || events.length == 0) {
			return;
		}
		pos += speed;
		timestampLabel.text(formatTimestamp(pos));

		while (events.length > 0 && events[0][0] <= pos) {
			var event = events.shift();
			handle(event[1]);
		}
	}, 50)

	function _start(data) {
		(options.on_connect || function () {})();
		(options.on_login || function (_user) {})(user);

		(options.on_init || function (_state) {})(data.state);
		events = data.events;

		pos = events[0][0];
		timestampLabel.text(formatTimestamp(pos));

		modal.close();
	}

	function _submit(e) {
		e.preventDefault();
		modal.elem.find("button").prop("disabled", true);

		$.ajax({
			"type": "POST",
			"url": "/replay/build",
			"data": new FormData(modal.elem.find("form")[0]),
			"processData": false,
			"contentType": false,
			"success": _start,
		});
	}

	modal.elem.find(".modal-body").append([
		$("<p>").text("Willkommen bei der Wiederholfunktion des GA-Prüfungsmonitor. Hier kannst du auf Basis eines CSV-Exports die Prüfung noch im Zeitraffer als Betrachter anschauen"),
		$("<form>").on("submit", _submit).attr("enctype", "multipart/form-data").append([
			$("<div>").addClass("mb-3").append([
				$("<label>").attr("for", "export_file").addClass("col-form-label").text("Export"),
				$("<input>").attr("type", "file").addClass("form-control").attr("name", "export_file").attr("id", "export_file")
			]),
		]),
	]);

	var button = $("<button>").addClass(["btn", "btn-primary"]).text("Start").click(_submit);
	modal.elem.find(".modal-footer").append(button);
	modal.show();

	function send(event) {
		if (event._m == "station_capacity") {
			handle({"_m": "station", "i": event.i, ...data.stations[event.i], "capacity": event.capacity});
		} else {
			console.log("Unknown event", data);
		}
	}

	return {
		"send": send,
	};
}

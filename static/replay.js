function ReliableWebSocket(options) {
	var speed = 20;
	var paused = true;
	var pos = null;
	var events = [];

	var stationEstimates = {};

	var playButton = $("<button>").addClass(["btn", "me-2", paused ? "btn-secondary" : "btn-outline-secondary"]).text("Play / Pause").click(function () {
		paused = !paused;
		$(this).toggleClass("btn-secondary", !paused);
		$(this).toggleClass("btn-outline-secondary", paused);

	});
	var timestampLabel = $("<span>");
	var estimateChartButton = $("<button>").addClass(["btn", "ms-2", "btn-secondary"]).text("Schätzungen").click(function () {
		var modal = new Modal("Schätzungsübersicht");
		modal.elem.find(".modal-dialog").addClass("modal-xl");

		var chartCanvas = $("<canvas>");
		modal.elem.find(".modal-body").append([
			$("<div>").append(chartCanvas),
		]);
		var datasets = Object.entries(stationEstimates).map(function (entry) {
			const validEstimates = entry[1].filter((estimate) => estimate.estimate != null);
			return {
				"label": data.stations[entry[0]].name,
				"data": validEstimates.map((estimate) => ({
					"x": estimate.timestamp,
					"y": (estimate.estimate - validEstimates[validEstimates.length - 1].estimate) / 3600,
				})),
			};
		});
		datasets.sort(function (a, b) {
			let _a = a.label.toLowerCase();
			let _b = b.label.toLowerCase();
			if (_a < _b) {return -1;}
			if (_a > _b) {return 1;}
			return 0;
		});
		var chart = new Chart(chartCanvas, {
			"type": "line",
			"data": {
				"datasets": datasets,
			},
			"options": {
				"scales": {
					"x": {
						"type": "linear",
						"ticks": {
							"callback": function (value, index, ticks) {
								var date = new Date(value * 1000);
								return (date.getHours() < 10 ? "0" : "") + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
							},
						},
					},
				},
			},
		});
		modal.show();
	});
	$("body").append($("<div>").css({"position": "fixed", "bottom": "1em", "left": "50%", "right": "50%", "margin": "0px -250px", "padding": ".3em", "width": "500px", "background": "#cccccc", "border-radius": ".5em"}).append(
		playButton,
		timestampLabel,
		estimateChartButton
	));

	var modal = new Modal("Prüfungswiederholung");
	const user = {"name": "Replay", "role": "viewer"};

	function handle(timestamp, event_data) {
		if ("handlers" in options && event_data._m in options.handlers) {
			options.handlers[event_data._m](event_data);
		}

		// Handler will redraw and calculate times
		for (const s_id of Object.keys(data.stations)) {
			if (!(s_id in stationEstimates)) {
				stationEstimates[s_id] = [];
			}
			const estimate = $(".station-" + s_id).find(".abschluss-value").data("timestamp");
			const lastEstimate = stationEstimates[s_id][stationEstimates[s_id].length - 1];
			// avoid spamming the same value
			if (lastEstimate == null || lastEstimate.timestamp != timestamp || lastEstimate.estimate != estimate) {
				stationEstimates[s_id].push({"timestamp": timestamp, "estimate": estimate});
			}
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
			handle(event[0], event[1]);
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

	var button = $("<button>").addClass(["btn", "btn-primary"]).text("Laden").click(_submit);
	modal.elem.find(".modal-footer").append(button);
	modal.show();

	function send(event) {
		if (event._m == "station_capacity") {
			handle(pos, {"_m": "station", "i": event.i, ...data.stations[event.i], "capacity": event.capacity});
		} else {
			console.log("Unknown event", event);
		}
	}

	return {
		"send": send,
		"time": () => (pos !== null) ? pos : Date.now() / 1000,
	};
}

function event2text(event) {
	if (event._m == "assignment") {
		const examiner = event.examiner;
		const examinee = data.examinees[event.examinee].name;
		const station = (event.station.startsWith("_") ? fixedStations : data.stations)[event.station].name;

		if (event.result == "open") {
			return "Zuweisung " + examinee + " (" + examiner + ") an " + station;
		}
		if (event.result == "done") {
			return "Abschluss " + examinee + " (" + examiner + ") an " + station;
		}
	}

	return JSON.stringify(event);
}

function formatTime(timestamp) {
	var date = new Date(timestamp * 1000);
	return (date.getHours() < 10 ? "0" : "") + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
}

function ReliableWebSocket(options) {
	var speed = 20;
	var paused = true;
	var pos = null;
	var events = [];

	var stationEstimates = {};

	function buildChart(datasets) {
		var chartCanvas = $("<canvas>");

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
							"callback": (value, index, ticks) => formatTime(value),
						},
					},
					"y": {
						"type": "linear",
						"position": "left",
					},
					"y2": {
						"type": "linear",
						"position": "right",
						"grid": {
							"drawOnChartArea": false,
						},
					},
				},
				"plugins": {
					"tooltip": {
						"callbacks": {
							"title": (contexts) => contexts.map((context) => formatTime(context.dataset.data[context.dataIndex].x) + " / " + event2text(context.dataset.data[context.dataIndex].event)),
							"label": (context) => context.dataset.label + ": " + Math.round(context.dataset.data[context.dataIndex].y * 100) / 100,
						},
					},
				},
			},
		});

		return $("<div>").append(chartCanvas);
	}

	var playButton = $("<button>").addClass(["btn", paused ? "btn-secondary" : "btn-outline-secondary"]).text("Play / Pause").click(function () {
		paused = !paused;
		$(this).toggleClass("btn-secondary", !paused);
		$(this).toggleClass("btn-outline-secondary", paused);

	});
	var timestampLabel = $("<p>");
	var estimateChartButton = $("<button>").addClass(["btn", "btn-secondary"]).text("Schätzungen").click(function () {
		var modal = new Modal("Schätzungsübersicht");
		modal.elem.find(".modal-dialog").addClass("modal-xl");

		var tab = new Tab();
		modal.elem.find(".modal-body").append(tab.elem);

		var datasets = Object.entries(stationEstimates).map(function (entry) {
			const validEstimates = entry[1].filter((estimate) => estimate.estimate != null);
			return {
				"label": data.stations[entry[0]].name,
				"data": validEstimates.map((estimate) => ({
					"x": estimate.timestamp,
					"y": (estimate.estimate - validEstimates[validEstimates.length - 1].estimate) / 3600,
					"event": estimate.event,
				})),
				"stepped": "before",
			};
		});
		tab.addPanel("Gesamt").panel.append(buildChart(datasets));

		var tabDatas = Object.entries(stationEstimates);
		tabDatas.sort(([a_id, a_estimates], [b_id, b_estimates]) => (data.stations[a_id].name < data.stations[b_id].name) ? -1 : 1);

		for (const [s_id, estimates] of tabDatas) {
			const validEstimates = estimates.filter((estimate) => estimate.estimate != null && estimate.event.station == s_id);

			tab.addPanel(data.stations[s_id].name).panel.append(buildChart([
				{
					"label": "Abweichung Schätzung [h]",
					"yAxisID": "y2",
					"data": validEstimates.map((estimate) => ({
						"x": estimate.timestamp,
						"y": (estimate.estimate - validEstimates[validEstimates.length - 1].estimate) / 3600,
						"event": estimate.event,
					})),
					"stepped": "before",
				},
				{
					"label": "Anzahl Prüfer*innen",
					"data": validEstimates.map((estimate) => ({
						"x": estimate.timestamp,
						"y": estimate.calc.activeExaminersCount,
						"event": estimate.event,
					})),
					"stepped": "before",
				},
				{
					"label": "Anzahl offener Prüflinge",
					"data": validEstimates.map((estimate) => ({
						"x": estimate.timestamp,
						"y": estimate.calc.totalExamineesCount - estimate.calc.examineesDoneCount,
						"event": estimate.event,
					})),
					"stepped": "before",
				},
				{
					"label": "Faktor",
					"data": validEstimates.map((estimate) => ({
						"x": estimate.timestamp,
						"y": estimate.calc.factor,
						"event": estimate.event,
					})),
					"stepped": "before",
				},
				{
					"label": "Stationsdauer [min]",
					"data": validEstimates.map((estimate) => ({
						"x": estimate.timestamp,
						"y": estimate.calc.stationTime / 60,
						"event": estimate.event,
					})),
					"stepped": "before",
				},
			]));
		}

		modal.show();
	});
	$("body").append($("<div>").css({"position": "fixed", "bottom": "1em", "left": "50%", "right": "50%", "margin": "0px -250px", "padding": ".3em", "width": "500px", "background": "#cccccc", "border-radius": ".5em"}).append(
		playButton.addClass("float-start"),
		estimateChartButton.addClass("float-end"),
		timestampLabel.addClass(["my-1", "text-center"]),
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
			const estimateElem = $(".station-" + s_id).find(".abschluss-value");
			const estimate = estimateElem.data("timestamp");
			const estimateData = estimateElem.data("timestamp_calc");
			const lastEstimate = stationEstimates[s_id][stationEstimates[s_id].length - 1];
			// avoid spamming the same value
			if (lastEstimate == null || lastEstimate.estimate != estimate) {
				stationEstimates[s_id].push({"timestamp": timestamp, "estimate": estimate, "calc": estimateData, "event": event_data});
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

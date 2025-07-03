function ReliableWebSocket(options) {
	var ws = null;
	var last_snr = null;
	var send_queue = [];

	if (options == null) {
		options = {};
	}

	var login_timeout = null;

	function _send(data) {
		if (data._m == "_login") {
			// Supress resend of login
			if (login_timeout !== null) {
				return;
			}
			login_timeout = setTimeout(function () {
				location.reload();
			}, 10000);

			data.last_snr = last_snr;
		}

		// Iff _cid is already in msg, the msg is already in send_queue
		if (!("_cid" in data)) {
			data._cid = _gen_id();
			send_queue.push(data);
		}

		if (ws !== null && ws.readyState === WebSocket.OPEN) {
			var encoded = JSON.stringify(data);
			ws.send(encoded);
		}
	}

	function _showLoadingScreen(content) {
		$("body").append(
			$("<div>").attr("id", "loading").css({
				backgroundColor: "rgba(255,255,255,0.5)",
				position: "fixed",
				left: 0,
				top: 0,
				right: 0,
				bottom: 0,
				zIndex: 99,
				width: "100%",
				height: "100%",
				display: "table",
			}).append(
				$("<div>").css({display: "table-cell", verticalAlign: "middle"}).append(
					content
				)
			)
		);
	}

	// Retry send_queue constantly
	window.setInterval(function () {
		for (var i in send_queue) {
			_send(send_queue[i]);
		}
	}, 5000);

	var auth = null;
	var state_chunks = null;
	var reload_timeout = null;

	function connect() {
		ws = new WebSocket(((location.protocol === "https:") ? "wss://" : "ws://") + location.hostname + (((location.port != 80) && (location.port != 443)) ? ":" + location.port : "") + "/socket");
		ws.onerror = function(event) {
			console.log("Error", event);
		}
		ws.onclose = function (event) {
			(options.on_close || function () {})();
			// Try to reconnect
			console.log("Connection closed");
		}
		ws.onopen = function(event) {
			console.log("Connection established");
			(options.on_connect || function () {})();
		}
		ws.onmessage = function(event) {
			var data = JSON.parse(event.data);
			if (!("_m" in data)) {
				console.log("Missing _m attribute", data);
				return;
			}

			if ("_cid" in data) {
				// check if item is in send-queue and transmission is now complete
				var queue_pos = send_queue.findIndex((msg) => (msg._cid === data._cid));
				if (queue_pos >= 0) {
					send_queue.splice(queue_pos, 1);
				}
			}

			if (data._m === "_auth_required") {
				// Use GUI to ask for login
				console.log("Require Login from GUI");
				(options.on_auth_required || function (_data) {})(data);
				return;
			}

			if (data._m === "_init") {
				// Yay, we are logged in
				auth = data.user;
				(options.on_login || function (_user) {})(data.user);

				if (login_timeout !== null) {
					clearTimeout(login_timeout);
					login_timeout = null;
				}
				$("#loading").remove();

				// Server told us new data
				if ("state" in data) {
					last_snr = data.state._snr;
					(options.on_init || function (_state) {})(data.state);
				}

				// Server will send us data in chunks
				if ("chunks" in data) {
					state_chunks = {"count": data.chunks, "data": []};
					// Open waiting dialog
					_showLoadingScreen(
						$("<div>").addClass("progress").css("width", "30%").css("margin", "auto").append(
							$("<div>").addClass(["progress-bar", "progress-bar-striped"]).css("width", "0%")
						)
					);

					login_timeout = setTimeout(function () {
						location.reload()
					}, 10000);
				}

				// Try send_queue immediatly to speed things up
				for (var i in send_queue) {
					_send(send_queue[i]);
				}
				return;
			}

			if (data._m === "_state") {
				// Receiving application state in chunks

				if (state_chunks === null) {
					// Ignore possible duplicate init-rounds
					return;
				}

				if (data.num != state_chunks.data.length) {
					// Counting error, reloading
					location.reload();
					return;
				}

				if (login_timeout !== null) {
					clearTimeout(login_timeout);
					login_timeout = null;
				}

				state_chunks.data.push(data.c);
				if (state_chunks.data.length === state_chunks.count) {
					$("#loading").remove();
					state = JSON.parse(state_chunks.data.join(""));
					state_chunks = null;
					last_snr = state._snr;
					(options.on_init || function (_state) {})(state);
				} else {
					$("#loading").find(".progress-bar").css("width", Math.round(data.num / state_chunks.count * 100) + "%");

					login_timeout = setTimeout(function () {
						location.reload()
					}, 10000);
				}
			}

			if (data._m === "_reload") {
				// May happen during bad renumberation errors
				location.reload();
				return;
			}

			if (data._m.startsWith("_")) {
				// Ignore other messages for now, but need to sign off the _cid above
				return;
			}

			// Find missing messages
			if ("_snr" in data && last_snr !== null) {
				var snr_delta = ((data._snr + 0xffff) - last_snr) % 0xffff;
				if (snr_delta == 1) {
					// Everything is good, we are not missing anything
					last_snr = data._snr;
				} else if (snr_delta <= (0xffff + 1) / 4) {
					// We miss some messages, but can still be certain that no overflow happened, so we ask for retransmission
					_send({"_m": "_fetch", "since_snr": last_snr})
					return;
				} else if (snr_delta >= (0xffff + 1) * 0.9) {
					// Messages are quite new, so we suspect a retransmission
					console.log("Retransmission detected", data);
					return;
				} else {
					// The delta is too large, better be safe and reload
					console.log("Too many messages missing, do full reload");
					location.reload();
					return;
				}
			}

			// Regular messages

			if ("handlers" in options && data._m in options.handlers) {
				options.handlers[data._m](data);
			}
		}
	}

	window.setInterval(function () {
		if (ws === null || ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
			console.log("Found invalid connection, reconnecting...");
			if (ws !== null) {
				ws.close();
			}
			ws = null;
			connect();
		}
	}, 2000);

	_showLoadingScreen(
		$("<div>").css("text-align", "center").append(
			$("<div>").addClass("spinner-border").css("width", "3em").css("height", "3em")
		)
	);

	connect();

	return {
		"send": _send,
		"reconnect": function () {
			// Reconnect will be triggered
			ws.close();
		},
	};
}

var socket = null;

function _gen_id() {
	var S4 = function() {
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	};
	return S4() + S4();
}

function ReliableWebSocket(options) {
	var ws = null;
	var last_snr = null;
	var send_queue = [];

	if (options == null) {
		options = {};
	}

	function _send(data) {
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

	// Retry send_queue constantly
	window.setInterval(function () {
		for (var i in send_queue) {
			_send(send_queue[i]);
		}
	}, 5000);

	var auth = null;

	function connect() {
		ws = new WebSocket(((location.protocol === "https:") ? "wss://" : "ws://") + location.hostname + (((location.port != 80) && (location.port != 443)) ? ":" + location.port : "") + "/socket");
		ws.onerror = function(event) {
			console.log("Error", event);
		}
		ws.onclose = function (event) {
			(options.on_close || function () {})();
			// Try to reconnect
			console.log("Connection closed, reconnecting in 2 Seconds");
			ws.close();
			window.setTimeout(connect, 2000);
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
				if (last_snr === null) {
					last_snr = data.state._snr;
					(options.on_init || function (_state) {})(data.state);
				} else if (data.state._snr != last_snr) {
					// after reconnect just ask for missed messages
					_send({"_m": "_fetch", "since_snr": last_snr})
				}

				// Try send_queue immediatly to speed things up
				for (var i in send_queue) {
					_send(send_queue[i]);
				}

				(options.on_login || function () {})();
				return;
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

	connect();

	return {
		"send": _send,
	};
}

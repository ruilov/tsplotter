function file_load_button_cb(evt) {
  var files = evt.target.files;
  if (files.length === 0) return;
  var file = files[0];
  var reader = new FileReader();
  reader.onload = (function(theFile) {
    return function(e) {
      var loaded_json = e.target.result;
      var loaded_data = JSON.parse(loaded_json)[0];
      thePage.state = loaded_data;
    };
  })(file);

  reader.readAsText(file);
}

function file_save_button_cb() {
  var make_json = function() {
    return JSON.stringify([thePage.state], null, "\t");
  };

  var onopen = function(e) {
    var websocket = e.target;
    websocket.send(make_json());
    websocket.close();
  };

  var onerror = function(e) {
    saveTextAs(make_json(), "plot.ts");
  };

  // fixme: online the socket is null, and we can't even set onerror!
  var socket = websocket_connect("9001");
  socket.onopen = onopen;
  socket.onerror = onerror;
}

function websocket_message(message, e, do_f9) {
  if (typeof(do_f9) == "undefined") do_f9 = true;

  if(message.type=="close") {
    e.target.close();
    return;
  }

  var state = {};
  if(message.type=="plots") {
    state.additional_scope = {};
    for (var elem of message.data) {
      state.additional_scope[elem.name] = {"map": {}};
      for (var e1 of elem.series) 
        state.additional_scope[elem.name].map[e1[0]] = e1[1];
    }
  } else state[message.type] = message.data;

  thePage.state = state;  
  if (do_f9) Page.f9_cb();
}

function websocket_onmessage(e) {
  var message = e.data;
  message = JSON.parse(message);
  if (message.type == "multiple") {
    for (var msg of message.data)
      websocket_message(msg, e, false);
    Page.f9_cb();
  } else websocket_message(message, e);
}

function websocket_connect(port) {
  try {
    var websocket = new WebSocket("ws://localhost:" + port + "/");
    websocket.onmessage = websocket_onmessage;
    websocket.port = port;
    return websocket;
  } catch (err) {
    console.log("failed to start websockets");
    console.log(err);
  }
}
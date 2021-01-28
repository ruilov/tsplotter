class IO {

  static file_load_button_cb(evt) {
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

  static file_save_button_cb() {
    var make_json = function() {
      return JSON.stringify([thePage.state], null, "\t");
    };

    var onopen = function(e) {
      var websocket = e.target;
      websocket.send(make_json());
      websocket.close();
    };

    // if we can't save through a socket, download it
    var onerror = function(e) {
      saveTextAs(make_json(), "plot.ts");
    };

    var socket = IO.websocket_connect("9001");
    saveTextAs(make_json(), "plot.ts");

    // if(socket===null) {
    //   onerror();
    // } else {
    //   socket.onopen = onopen;
    //   socket.onerror = onerror;
    // }
  }

  static parse_excel_data(text) {
    var data = [];

    // parse the text into a table
    var lines = text.split(String.fromCharCode(13));
    for(var line of lines) data.push(line.split(String.fromCharCode(9)));
    
    // make a place for us to put the data into
    var series = [];
    for(var c = 1; c < data[0].length; c++) series[c] = {};

    // actual parsing the data
    for(var row = 1; row < data.length; row++) {
      var parsed = Date.parse(data[row][0]);
      if(isNaN(parsed)) continue;
      var dt = dateToStr(new Date(parsed));
      for(c = 1; c < data[row].length; c++) {
        parsed = parseFloat(data[row][c]);
        if(isNaN(parsed)) continue;
        series[c][dt] = parsed;
      }
    }

    // construct the scope and formulas
    var state = thePage.state;
    for(c = 1; c < data[0].length; c++) {
      state.additional_scope[data[0][c]] = {"map": series[c]};
      state.parsed_formulas.push({"text": data[0][c]});
    }
    thePage.state = state;
    thePage.f9_cb();
  }

  static websocket_message(message, e, do_f9) {
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
    thePage.plot.add_default_options();
    if (do_f9) thePage.f9_cb();
  }

  static websocket_onmessage(e) {
    var message = e.data;
    message = JSON.parse(message);
    if (message.type == "multiple") {
      for (var msg of message.data)
        IO.websocket_message(msg, e, false);
      thePage.f9_cb();
    } else IO.websocket_message(message, e);
  }

  static websocket_connect(port) {
    try {
      var websocket = new WebSocket("ws://localhost:" + port + "/");
      websocket.onmessage = IO.websocket_onmessage;
      websocket.port = port;
      return websocket;
    } catch (err) {
      console.log("failed to start websockets");
      console.log(err);
      return null;
    }
  }
}
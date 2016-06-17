function handleFileLoad(evt) {
  var files = evt.target.files; 
  if(files.length==0) return;

  var file = files[0];
  var reader = new FileReader();

  reader.onload = (function(theFile) {
    return function(e) {
      var loaded_json = e.target.result;
      var loaded_data = JSON.parse(loaded_json)[0];

      if("parsed_formulas" in loaded_data) {
        formula_area.parsed_formulas = loaded_data.parsed_formulas;
        evaluator.start = loaded_data.start;
        evaluator.end = loaded_data.end;
        if("chart_type" in loaded_data) thePlot.setChartType(loaded_data.chart_type);
        if("chart_options" in loaded_data) set_options(loaded_data.chart_options,false);
        for(var name in loaded_data.additional_scope)
          evaluator.additional_scope[name] = make_series(loaded_data.additional_scope[name].map);
      } else {
        // backwards compatibility
        formula_area.parsed_formulas = loaded_data;
      };
    };
  })(file);

  reader.readAsText(file);
};

function handleFileSave() {
  var make_json = function() {
    var to_save = {
      "parsed_formulas": formula_area.parsed_formulas,
      "additional_scope": evaluator.additional_scope,
      "start": evaluator.start_text,
      "end": evaluator.end_text,
      "chart_type": thePlot.getChartType(),
      "chart_options": thePlot.getOptions(),
    };
    var json = JSON.stringify([to_save],null,"\t");
    return json;
  };

  var onopen = function(e) {
    var websocket = e.target;
    websocket.send(make_json());
    websocket.close();
  };

  var onerror = function(e) {
    saveTextAs(make_json(),"plot.ts");
  };

  var socket = websocket_connect("9001")
  socket.onopen = onopen;
  socket.onerror = onerror;
};

function handleQuandl() {
  var old_key = localStorage.quandl_key;
  if(!old_key) {
    old_key = "";
    if(typeof quandl_api_key != 'undefined') old_key = quandl_api_key;
  };
  var key = prompt("Enter your quandl.com API key", old_key);
  if(key != null) {
    quandl_api_key = key;
    localStorage.setItem("quandl_key",quandl_api_key);
  };
};

function handle_message(message,e,do_f9) {
  if(typeof(do_f9)=="undefined") do_f9 = true;

  if(message.type=="plots") {
    for(var elem of message.data) {
      var series = new Series();
      for(var e of elem.series) series.put(e[0],e[1]);
      evaluator.add_to_scope(elem.name,series);
    };
  };

  if(message.type=="start") evaluator.start = message.data;
  if(message.type=="end") evaluator.end = message.data;
  if(message.type=="formulas") formula_area.parsed_formulas = message.data;
  if(message.type=="chart_type") thePlot.setChartType(message.data);
  if(message.type=="chart_options") set_options(message.data,false);
  
  if(message.type=="close") e.target.close();
  else if(do_f9) f9_cb();
};

function websocket_onmessage(e) {
  var message = e.data;
  message = JSON.parse(message);
  if(message.type=="multiple") {
    for(var msg of message.data) 
      handle_message(msg,e,false);
    f9_cb();
  } else handle_message(message,e);
};

function websocket_connect(port) {
  try {
    var websocket = new WebSocket("ws://localhost:" + port + "/");
    websocket.onmessage = websocket_onmessage;
    websocket.port = port;
    return websocket;
  } catch(err) {
    console.log("failed to start websockets");
    console.log(err);
  };
};

function make_permalink() {
  var state = {
    "parsed_formulas": formula_area.parsed_formulas,
    "start": evaluator.start_text,
    "end": evaluator.end_text,
    "chart_type": thePlot.getChartType(),
    "chart_options": thePlot.getOptions(),
  };
  var json = JSON.stringify(state);
  var b64 = btoa(json);
  b64 = encodeURIComponent(b64);

  var url = window.location.protocol + "//" + window.location.pathname + "?plot=" + b64;

  return url;
};

// Read a page's GET URL variables and return them as an associative array.
function getUrlVars() {
  var vars = [], hash;
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for(var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  };
  return vars;
};

function b64_to_state(b64) {
  var decoded = decodeURIComponent(b64);
  var json = atob(decoded);
  var parsed = JSON.parse(json);
  formula_area.parsed_formulas = parsed.parsed_formulas;
  evaluator.start = parsed.start;
  evaluator.end = parsed.end;
  thePlot.setChartType(parsed.chart_type);
  set_options(parsed.chart_options);
};
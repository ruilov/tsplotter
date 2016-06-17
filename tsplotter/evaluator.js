class Evaluator {

  // ===== CONSTRUCTION ======
  constructor(formula_area) {
    this.formula_area = formula_area;
    this.cached_datasets = {};
    this.error_messages = [];
    this.additional_scope = {};

    this.db_default_tags = {
      "WIKI": "Adj. Close",
      "CME": "Settle",
      "ICE": "Settle",
      "CHRIS": "Settle",
      "EIA": "Value",
      "GOOG": "Close",
      "YAHOO": "Close",
      "JODI": "Value",
      "FRED": "VALUE",
      "BOE": "Value",
      "MOODY": "VALUE",
    };

    this.color_defaults = [
      "#3366CC",
      "#DC3912",
      "#FF9900",
      "#109618",
      "#990099",
      "#3B3EAC",
      "#0099C6",
      "#DD4477",
      "#66AA00",
      "#B82E2E",
      "#316395",
      "#994499",
      "#22AA99",
      "#AAAA11",
      "#6633CC",
      "#E67300",
      "#8B0707",
      "#329262",
      "#5574A6",
      "#3B3EAC"
    ];
  };

  // ===== GETTERS ======

  get symbol_deps() {
    var formulas = this.formula_area.parsed_formulas;

    var symbols = {};
    var assignedSymbols = {}; // these are symbols that were assigned so we don't need to load

    for(var formula2 of formulas) {
      if(formula2.off) continue;
      var formula = formula2.text.trim();
      formula = formula.replace(String.fromCharCode(160),"");
      if(formula.length==0) continue;
      
      var parsed_formula = math.parse(formula); 
      var thisSymbols = this.symbol_nodes(parsed_formula);
      for(var symbol of thisSymbols) 
        if(!(symbol in assignedSymbols)) symbols[symbol] = 1;
      if(parsed_formula.type=="AssignmentNode") assignedSymbols[parsed_formula.name] = 1;
    };
    return Object.keys(symbols);
  };

  symbol_nodes(parsed_formula) {
    return parsed_formula.filter(function(x) {
      return x.isSymbolNode && (parsed_formula.type!="AssignmentNode" || x.name!=parsed_formula.name);
    }).map(function(x) {
      return x.name.replace("_dict","");
    });
  };

  get start_text() {
    return document.getElementById("start-date").value.trim();
  };

  get start() {
    return parse_value(this.start_text);
  };

  get end_text() {
    return document.getElementById("end-date").value.trim();
  };

  get end() {
    return parse_value(this.end_text);
  };

  get error_message() {
    var msg = "";
    for(var mi=0;mi<this.error_messages.length;mi++) {
      msg += this.error_messages[mi];
      if(mi<this.error_messages.length-1) msg += "\n";
    };
    return msg;
  };

  get unkeyed_calls() {
    // localStorage.removeItem("unkeyed_calls");
    var unkeyed_calls = localStorage.unkeyed_calls;
    // console.log(unkeyed_calls);
    if(typeof(unkeyed_calls)=="undefined" || unkeyed_calls==null) unkeyed_calls = {};
    else unkeyed_calls = JSON.parse(unkeyed_calls);

    var today = dateToStr(new Date());
    var ans = 0;
    if(today in unkeyed_calls) ans = unkeyed_calls[today];
    return ans;
  };

  // ===== SETTERS ======
  set start(date_str) {
    document.getElementById("start-date").value = date_str;
  };

  set end(date_str) {
    document.getElementById("end-date").value = date_str;
  };

  set unkeyed_calls(c) {
    var today = dateToStr(new Date());
    var unkeyed_calls = {};
    unkeyed_calls[today] = c;
    localStorage.unkeyed_calls = JSON.stringify(unkeyed_calls);
  };

  add_to_scope(name,series) {
    this.additional_scope[name] = series;
  };

  // ===== UTILITIES ======

  // pay attention to case. Databases and symbols are case sensitive, but this function is only
  // used to retrieve the default tag for each database
  symbol_database(symbol) {
    return symbol.split("|")[0].toUpperCase();
  };

  is_symbol_cached(symbol) {
    if(symbol in this.additional_scope) return true;
    if(!(symbol in this.cached_datasets)) return false;
    return this.start>=this.cached_datasets[symbol].start && this.end<=this.cached_datasets[symbol].end;
  };

  all_deps_cached() {
    for(var dep of this.symbol_deps) 
      if(!this.is_symbol_cached(dep)) 
        return false;
    return true;
  };

  error_fn() {
    this.error_cb(this.error_message);
  }

  eval_fn() {
    if(!this.all_deps_cached()) return;

    this.scope = {};
    for(var s in this.additional_scope)
      this.scope[s] = this.additional_scope[s];

    var formulas = this.formula_area.parsed_formulas;

    for(var fi=0; fi<formulas.length;fi++) {
      if(formulas[fi].off) continue;
      var formula = formulas[fi].text.trim();
      formula = formula.replace(String.fromCharCode(160),"");
      if(formula.length==0) continue;

      // eval it
      try{
        // populate the scope with cached data from quandl before evaluing
        this.populate_scope(formula);
        var evaled = math.eval(formula,this.scope);
        if(evaled==null) throw formula + ": error evaluating series";
        if(typeof(evaled)=="number") evaled = make_constant_series(evaled,this.start,this.end);
      } catch(err) {
        console.log(err);
        console.log(err.stack);
        this.error_messages.push(err.toString());
        this.error_fn();
        return;
      };
      if(formulas[fi].hidden) continue;

      formulas[fi].evaled = evaled;
          
      var title = formulas[fi].title;
      if(!title) title = this.make_title(formula);
      formulas[fi].display_title = title;

      if(formulas[fi].color) formulas[fi].color = rgb2hex(formulas[fi].color);
    };

    this.populate_missing_colors(formulas);
    this.formula_area.parsed_formulas = formulas;
    
    // filter out empty spaces?!
    formulas = formulas.filter(function(x) {return x.evaled;});

    for(var formula of formulas)
      formula.evaled = formula.evaled.range(this.start,this.end);

    this.plot_cb(formulas);
  };

  populate_missing_colors(formulas) {
    var colors_used = {};
    for(var idx in formulas) 
      if(formulas[idx].color) colors_used[formulas[idx].color] = 1;
    
    var color_idx = 0;
    for(var idx=0; idx < formulas.length; idx++) {
      if(formulas[idx].off || formulas[idx].hidden) continue;
      if(formulas[idx].color) continue;
      var formula = formulas[idx].text.trim();
      formula = formula.replace(String.fromCharCode(160),"");
      if(formula.length==0) continue;

      // first try to find one that hasn't been used
      var found = false;
      for(var ii = 0; ii < this.color_defaults.length; ii++) {
        var jj = (color_idx+ii)%this.color_defaults.length;
        var pcolor = this.color_defaults[jj];
        if(!(pcolor.toLowerCase() in colors_used)) {
          found = true;
          formulas[idx].color = pcolor;
          color_idx = (jj + 1)%this.color_defaults.length;
          break;
        };
      };
      if(!found) {
        formulas[idx].color = this.color_defaults[color_idx];
        color_idx = (color_idx+1)%this.color_defaults.length;
      };

      colors_used[formulas[idx].color.toLowerCase()]=1;
    };
  };

  // finds out what symbols this formula depends on, and if they are cached then populate them in the scope
  populate_scope(formula) {
    var parsed = math.parse(formula);
    var thisSymbols = this.symbol_nodes(parsed);
    for(var symbol of thisSymbols) {
      if(!(symbol in this.scope)) {
        var database = this.symbol_database(symbol);
        if(database in this.db_default_tags) {
          var val = this.cached_datasets[symbol].data2[this.db_default_tags[database]];
          if(val) this.scope[symbol] = val.range(this.start,this.end);
        };
      };

      var dict_symbol = symbol + "_dict";
      if(!(dict_symbol in this.scope)) {
        if(symbol in this.cached_datasets) { // user defined symbols will not be in cached dataset
          this.scope[dict_symbol] = {};
          for(var tag in this.cached_datasets[symbol].data2) {
            this.scope[dict_symbol][tag] = this.cached_datasets[symbol].data2[tag].range(this.start,this.end);
          };
        };
      };
    };
  };

  make_title(formula) {
    var title = formula;

    var parsed = math.parse(formula);
    var thisSymbols = this.symbol_nodes(parsed);
    if(thisSymbols.length==1) {
      var node = parsed;
      if(parsed.type=="AssignmentNode") node = parsed.value;
      if(node.type=="SymbolNode" || node.type=="AccessorNode") {
        // check it's an actual, non-user defined, symbol
        if(thisSymbols[0] in this.cached_datasets) {
          title = this.cached_datasets[thisSymbols[0]].name;
          if(node.type=="AccessorNode") {
            title += "[" + node.name + "]";
          };
        };
      };
    };

    var idx = title.indexOf("Prices, Dividends, Splits and Trading Volume");
    if(idx>=0) title = title.substr(0,idx-1);
    return title;
  };

  // QUANDL
  quandl_url(symbol) {
    if(symbol.indexOf("|")<0) {
      this.error_messages.push(symbol + ": malformed database symbol"); 
      this.error_fn();
      return null;
    };

    var url = "https://www.quandl.com/api/v3/datasets/" + symbol.replace("|","/").toUpperCase() + ".json?api_key=" + quandl_api_key;
    if(this.start_text.length>0) url += "&start_date=" + this.start_text;
    if(this.end_text.length>0) url += "&end_date=" + this.end_text;
    return url;
  };

  evaluate(plot_cb,error_cb) {
    this.error_messages = [];
    this.plot_cb = plot_cb;
    this.error_cb = error_cb;

    try{
      var symbols = evaluator.symbol_deps;
    } catch(err) {
      console.log(err);
      console.log(err.stack);
      this.error_messages.push(err.toString());
      this.error_fn();
      return;
    };

    for(var symbol of symbols) {
      if(this.is_symbol_cached(symbol)) continue;

      var url = this.quandl_url(symbol);
      if(!url) return;  // means we couldn't parse the symbol

      // check if the user is using a key, and log usage if not so that we can warn the user
      if(quandl_api_key=="") {
        var calls = this.unkeyed_calls + 1;
        this.unkeyed_calls = calls;
        if(calls>30) show_key_warning(calls);
        console.log("("+calls+") calling: " + url);
      } else {
        console.log("calling: " + url);
      };
      
      $.getJSON(url, this.quandl_success_cb(symbol)).error(this.quandl_error_cb(symbol));
    };

    this.eval_fn(); // in case there were not json calls
  };

  quandl_success_cb(symbol) {
    var tt = this;
    return function(retVal) {
      var dataset = retVal.dataset;

      var col_names = dataset.column_names.map(function(x) {return x.toLowerCase();});
      var dateIdx = col_names.indexOf("date");
      if(dateIdx<0) {
        console.log(dataset.column_names);
        tt.error_messages.push(symbol + ": date column not found");
        tt.error_fn();
        return;
      };

      // parse the dates
      dataset.start = parseDate(dataset.start_date);
      dataset.end = parseDate(dataset.end_date);
      
      if(symbol in tt.cached_datasets) {
        tt.cached_datasets[symbol].start = Math.min(tt.cached_datasets[symbol].start,dataset.start);
        tt.cached_datasets[symbol].end = Math.max(tt.cached_datasets[symbol].end,dataset.end);
      } else {
        tt.cached_datasets[symbol] = dataset;
        tt.cached_datasets[symbol].data2 = {};
        for(var colName of dataset.column_names) 
          tt.cached_datasets[symbol].data2[colName] = new Series();
      };

      // add the data
      for(var ci=0;ci<dataset.column_names.length;ci++) {
        var colName = dataset.column_names[ci];
        for(var ri=0;ri<dataset.data.length;ri++) {
          var dt = dataset.data[ri][dateIdx];
          var val = dataset.data[ri][ci];
          tt.cached_datasets[symbol].data2[colName].put(dt,val);
        };
      };

      tt.eval_fn();
    };
  };

  quandl_error_cb(symbol) {
    var tt = this;
    return function(jqXHR) {
      tt.error_messages.push(symbol + ": " + jqXHR.responseText);
      tt.error_fn();
    };
  };
};

function rgb2hex(rgb) {
    if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    function hex(x) {return ("0" + parseInt(x).toString(16)).slice(-2);};
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
};


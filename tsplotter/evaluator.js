class Evaluator {

  static get db_default_tags() {
    return {
      "WIKI": "Adj. Close",
      "CME": "Settle",
      "ICE": "Settle",
      "CHRIS": "Settle",
      "EIA": "Value",
      "GOOG": "Close",
      "YAHOO": "Close",
      "JODI": "Value",
      "FRED": "Value",
      "BOE": "Value",
      "MOODY": "VALUE",
      "STOCK": "adjusted close",
    };
  }

  static get color_defaults() {
    return [
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
  }

  // ===== CONSTRUCTION ======
  constructor(formula_area) {
    this.formula_area = formula_area;
    this.cached_datasets = {};
    this.error_messages = [];
    this.additional_scope = {};
    
    var d = new Date();
    this.end = dateToStr(d);
    d.setFullYear(d.getFullYear()-2);
    this.start = dateToStr(d);
  }

  // ===== GETTERS ======

  get state() {
    return {
      "additional_scope": this.additional_scope,
      "start": this.start_text,
      "end": this.end_text,
    };
  }

  // formula should be one of this.formula_area.parsed_formulas
  // note that in the context of formula_area parsing means extracting the text of the formula out of the html
  // in the context of the evaluator, parsing means extracting the math.js tree out of the formula text
  parse_formula(formula,scope) {
    var formula_text = formula.text.trim();
    formula_text = formula_text.replace(String.fromCharCode(160), "");
    if (formula_text.length === 0) return null;
    var parsed_formula = math.parse(formula_text,{'scope': scope});
    return parsed_formula;
  }

  get symbol_deps() {
    var formulas = this.formula_area.parsed_formulas;

    var symbols = {};
    var assignedSymbols = {}; // these are symbols that were assigned so we don't need to load
    var scope = {};

    for (var formula2 of formulas) {
      if (formula2.off) continue;
      var parsed_formula = this.parse_formula(formula2,scope);
      if(parsed_formula===null) continue;
      var thisSymbols = this.symbol_nodes(parsed_formula);

      // evaluate the formula if possible so that the parsing scope can be as complete as it can be
      // obv some formulas won't evaluate due to dependencies on external data
      try {
        parsed_formula.eval(scope);
      } catch(err) {}

      for (var symbol of thisSymbols)
        if (!(symbol in assignedSymbols)) symbols[symbol] = 1;
      if (parsed_formula.type == "AssignmentNode") assignedSymbols[parsed_formula.name] = 1;
    }
    return Object.keys(symbols);
  }

  symbol_nodes(parsed_formula) {
    return parsed_formula.filter(x => 
      x.isSymbolNode && (parsed_formula.type != "AssignmentNode" || x.name != parsed_formula.name) // if thi is an assignment, skip the symbol on the left hand side
    ).map(x => x.name.replace("_dict", "")); // I made a change to math.js that adds _dict to symbol nodes
  }

  get start_text() {
    return HTML.start_date_elem().value.trim();
  }

  get start() {
    return parse_value(this.start_text);
  }

  get end_text() {
    return HTML.end_date_elem().value.trim();
  }

  get end() {
    return parse_value(this.end_text);
  }

  get error_message() {
    return this.error_messages.join("\n");
  }

  // ===== SETTERS ======

  set state(state) {
    if ("start" in state) this.start = state.start;
    if ("end" in state) this.end = state.end;
    if ("additional_scope" in state) {
      for (var name in state.additional_scope)
        this.additional_scope[name] = make_series(state.additional_scope[name].map);
    }
  }

  set start(date_str) {
    HTML.start_date_elem().value = date_str;
  }

  set end(date_str) {
    HTML.end_date_elem().value = date_str;
  }

  add_to_scope(name, series) {
    this.additional_scope[name] = series;
  }

  // ===== UTILITIES ======

  // pay attention to case. Databases and symbols are case sensitive, but this function is only
  // used to retrieve the default tag for each database
  symbol_database(symbol) {
    return symbol.split("|")[0].toUpperCase();
  }

  is_symbol_cached(symbol) {
    if (symbol in this.additional_scope) return true;
    if (!(symbol in this.cached_datasets)) return false;
    return this.start >= this.cached_datasets[symbol].start && this.end <= this.cached_datasets[symbol].end;
  }

  all_deps_cached() {
    for (var dep of this.symbol_deps)
      if (!this.is_symbol_cached(dep))
        return false;
    return true;
  }

  error_fn() {
    this.error_cb(this.error_message);
  }

  eval_fn() {
    if (!this.all_deps_cached()) return;
    HTML.cursor_style("default");

    this.scope = {};
    for (var s in this.additional_scope)
      this.scope[s] = this.additional_scope[s];

    var formulas = this.formula_area.parsed_formulas;
    for (var fi = 0; fi < formulas.length; fi++) {
      if (formulas[fi].off) continue;

      var parsed = this.parse_formula(formulas[fi],this.scope);
      if(parsed===null) continue;
      var thisSymbols = this.symbol_nodes(parsed);

      // eval it
      var evaled;
      try {
        // populate the scope with cached data before evaluing
        this.populate_scope(thisSymbols);
        evaled = parsed.eval(this.scope);
        if (evaled == null) throw formulas[fi].text + ": error evaluating series";
        if (typeof(evaled) == "number") evaled = make_constant_series(evaled, this.start, this.end);
      } catch (err) {
        console.log(err);
        console.log(err.stack);
        this.error_messages.push(err.toString());
        this.error_fn();
        return;
      }

      formulas[fi].evaled = evaled;
      if (formulas[fi].color) formulas[fi].color = rgb2hex(formulas[fi].color);
      
      var title = formulas[fi].title;
      if (!title) title = this.make_title(formulas[fi].text,parsed,thisSymbols);
      formulas[fi].display_title = title;
    }

    this.populate_missing_colors(formulas);
    this.formula_area.parsed_formulas = formulas;

    formulas = formulas.filter(x => x.evaled); // filter out empty spaces
    // keep only the desired range
    for(var formula of formulas) 
      if(typeof formula.evaled.range === "function") // this allows the user to create string variables
        formula.evaled = formula.evaled.range(this.start, this.end);
    // callback to plot
    this.plot_cb(_.filter(formulas,x => !x.hidden));
  }

  populate_missing_colors(formulas) {
    var colors_used = {};
    for (var idx in formulas)
      if (formulas[idx].color) colors_used[formulas[idx].color] = 1;

    var color_idx = 0;
    for (idx = 0; idx < formulas.length; idx++) {
      if (formulas[idx].off || formulas[idx].hidden) continue;
      if (formulas[idx].color) continue;

      // first try to find one that hasn't been used
      var found = false;
      for (var ii = 0; ii < Evaluator.color_defaults.length; ii++) {
        var jj = (color_idx + ii) % Evaluator.color_defaults.length;
        var pcolor = Evaluator.color_defaults[jj];
        if (!(pcolor.toLowerCase() in colors_used)) {
          found = true;
          formulas[idx].color = pcolor;
          color_idx = (jj + 1) % Evaluator.color_defaults.length;
          break;
        }
      }
      if (!found) {
        formulas[idx].color = Evaluator.color_defaults[color_idx];
        color_idx = (color_idx + 1) % Evaluator.color_defaults.length;
      }

      colors_used[formulas[idx].color.toLowerCase()] = 1;
    }
  }

  // finds out what symbols this formula depends on, and if they are cached then populate them in the scope
  populate_scope(thisSymbols) {
    for (var symbol of thisSymbols) {
      if (!(symbol in this.scope)) {
        var database = this.symbol_database(symbol);
        if (database in Evaluator.db_default_tags) {
          var val = this.cached_datasets[symbol].data2[Evaluator.db_default_tags[database]];
          if (val) this.scope[symbol] = val.range(this.start, this.end);
        }
      }

      var dict_symbol = symbol + "_dict";
      if (!(dict_symbol in this.scope)) {
        if (symbol in this.cached_datasets) { // user defined symbols will not be in cached dataset
          this.scope[dict_symbol] = {};
          for (var tag in this.cached_datasets[symbol].data2) {
            this.scope[dict_symbol][tag] = this.cached_datasets[symbol].data2[tag].range(this.start, this.end);
          }
        }
      }
    }
  }

  make_title(formula,parsed,thisSymbols) {
    var title = formula;
    if (thisSymbols.length == 1) {
      var node = parsed;
      if (parsed.type == "AssignmentNode") node = parsed.value;
      if (node.type == "SymbolNode" || node.type == "AccessorNode") {
        // check it's an actual, non-user defined, symbol
        if (thisSymbols[0] in this.cached_datasets) {
          title = this.cached_datasets[thisSymbols[0]].name;
          if (node.type == "AccessorNode") {
            title += "[" + node.name + "]";
          }
        }
      }
    }

    var idx = title.indexOf("Prices, Dividends, Splits and Trading Volume");
    if (idx >= 0) title = title.substr(0, idx - 1);
    return title;
  }

  // QUANDL
  quandl_url(symbol) {
    if (symbol.indexOf("|") < 0) {
      this.error_messages.push(symbol + ": malformed database symbol");
      this.error_fn();
      return null;
    }

    var url = "https://www.quandl.com/api/v3/datasets/" + symbol.replace("|", "/").toUpperCase() + ".json?api_key=" + thePage.get_key("quandl");
    if (this.start_text.length > 0) url += "&start_date=" + this.start_text;
    if (this.end_text.length > 0) url += "&end_date=" + this.end_text;
    return url;
  }

  alphaadv_url(symbol) {
    var ticker = symbol.split("|")[1];  // guarantee to start with STOCK|
    return "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=" + ticker + "&outputsize=full&apikey=" + thePage.get_key("alphaadvantage");
  }

  fred_url(symbol) {
    var ticker = symbol.split("|")[1];  // guarantee to start with FRED|
    // work around for CORS
    var url = "https://cors-anywhere.herokuapp.com/https://api.stlouisfed.org/fred/series/observations?series_id=" + ticker + "&api_key=" + thePage.get_key("fred") + "&file_type=json";

    if (this.start_text.length > 0) url += "&observation_start=" + this.start_text;
    if (this.end_text.length > 0) url += "&observation_end=" + this.end_text;
    return url;
  }

  evaluate(plot_cb, error_cb) {
    this.error_messages = [];
    this.plot_cb = plot_cb;
    this.error_cb = error_cb;

    var symbols;
    try {
      symbols = this.symbol_deps;
    } catch (err) {
      console.log(err);
      console.log(err.stack);
      this.error_messages.push(err.toString());
      this.error_fn();
      return;
    }

    for (var symbol of symbols) {
      if (this.is_symbol_cached(symbol)) continue;

      if(symbol.startsWith("STOCK|")) {
        // this uses a special service
        var url = this.alphaadv_url(symbol);
        if (!url) return; // means we couldn't parse the symbol
        console.log("calling: " + url);
        $.getJSON(url, this.alphaadv_success_cb(symbol)).error(this.data_source_error_cb(symbol));
      } 
      else if(symbol.startsWith("FRED|")) {
        // we bypass quandl for FRED because (a) fred has an API, (b) quandl doesn't have all the data in its fred database
        var url = this.fred_url(symbol);
        if (!url) return; // means we couldn't parse the symbol
        console.log("calling: " + url);
        $.getJSON(url, {"origin": "api.stlouisfed.org"}, this.fred_success_cb(symbol)).error(this.data_source_error_cb(symbol));
      } 
      else {
        var url = this.quandl_url(symbol);
        if (!url) return; // means we couldn't parse the symbol
        console.log("calling: " + url);
        $.getJSON(url, this.quandl_success_cb(symbol)).error(this.data_source_error_cb(symbol));
      }
    }
    HTML.cursor_style("progress");

    this.eval_fn(); // in case there were no json calls
  }

  fred_success_cb(symbol) {
    var tt = this;
    return function(retVal) {
      if("Error Message" in retVal) {
        console.log(retVal);
        tt.error_messages.push(symbol + ": " + retVal["Error Message"]);
        tt.error_fn();
        return;
      }

      // console.log(retVal);

      var dataset = retVal;
      tt.cached_datasets[symbol] = dataset;
      tt.cached_datasets[symbol].name = symbol; // used to create the legend in the plot
      // if the dates don't go as far as what we're asking for, use instead the dates that we asked for
      // so that the eval function knows that this dataset is now cached
      tt.cached_datasets[symbol].start = Math.min(parseDate(dataset.observation_start),tt.start);
      tt.cached_datasets[symbol].end = Math.max(parseDate(dataset.observation_end),tt.end);
      tt.cached_datasets[symbol].data2 = {"Value": new Series()};

      for(var idx in dataset["observations"]) {
        var val = parseFloat(dataset["observations"][idx]["value"])
        var dateStr = dataset["observations"][idx]["date"]
        // this is a performance optimization. For some reason Series.put is slow!
        if(idx==0)
            tt.cached_datasets[symbol].data2["Value"].put(dateStr,val);
          else
            tt.cached_datasets[symbol].data2["Value"].map[dateStr] = val;
      }

      tt.eval_fn();
    };
  }

  alphaadv_success_cb(symbol) {
    var tt = this;
    return function(retVal) {
      if("Error Message" in retVal) {
        console.log(retVal);
        tt.error_messages.push(symbol + ": " + retVal["Error Message"]);
        tt.error_fn();
        return;
      }

      if(!("Time Series (Daily)" in retVal)) {
        var errMsg = "The alpha Vantage stock database (https://www.alphavantage.co) returned an error.";
        if("Information" in retVal) errMsg += "<br>" + retVal.Information+"<br>";
        console.log(retVal);
        tt.error_messages.push(symbol + ": " + errMsg);
        tt.error_fn();
        return;
      }

      var dataset = retVal["Time Series (Daily)"];
      var col_names = Object.keys(Object.values(dataset)[0]).map(x => x.split(".")[1].trim());

      tt.cached_datasets[symbol] = dataset;
      tt.cached_datasets[symbol].name = symbol; // used to create the legend in the plot
      tt.cached_datasets[symbol].start = new Date(-8640000000000000);
      tt.cached_datasets[symbol].end = new Date(8640000000000000);

      tt.cached_datasets[symbol].data2 = {};
      for(var cn of col_names)
        tt.cached_datasets[symbol].data2[cn] = new Series();

      var count = 0;
      for(var dateStr in dataset) {
        count += 1;
        if(dateStr=="data2" || dateStr=="start" || dateStr=="end" || dateStr=="name") continue;

        for(var rawCol in dataset[dateStr]) {
          var val = parseFloat(dataset[dateStr][rawCol]);
          var colName = rawCol.split(".")[1].trim();

          // this is a performance optimization. For some reason Series.put is slow!
          if(count==1)
            tt.cached_datasets[symbol].data2[colName].put(dateStr,val);
          else
            tt.cached_datasets[symbol].data2[colName].map[dateStr] = val;
        }
      }

      tt.eval_fn();
    };
  }

  quandl_success_cb(symbol) {
    var tt = this;
    return function(retVal) {
      var dataset = retVal.dataset;
      var col_names = dataset.column_names.map(x => x.toLowerCase());
      var dateIdx = col_names.indexOf("date");
      if (dateIdx < 0) {
        dateIdx = col_names.indexOf("month"); // the EIA database is formatted by month
        if (dateIdx < 0) {
          console.log(dataset.column_names);
          tt.error_messages.push(symbol + ": date column not found");
          tt.error_fn();
          return;
        }
      }

      // parse the dates
      // if the dates don't go as far as what we're asking for, use instead the dates that we asked for
      // so that the eval function knows that this dataset is now cached
      dataset.start = Math.min(parseDate(dataset.start_date),tt.start);
      dataset.end = Math.max(parseDate(dataset.end_date),tt.end);

      if (symbol in tt.cached_datasets) {
        tt.cached_datasets[symbol].start = Math.min(tt.cached_datasets[symbol].start, dataset.start);
        tt.cached_datasets[symbol].end = Math.max(tt.cached_datasets[symbol].end, dataset.end);
      } else {
        tt.cached_datasets[symbol] = dataset;
        tt.cached_datasets[symbol].data2 = {};
        for (var cn of dataset.column_names) {
          tt.cached_datasets[symbol].data2[cn] = new Series();
          tt.cached_datasets[symbol].data2[cn.toLowerCase()] = tt.cached_datasets[symbol].data2[cn]; // allows the user to not worry about case
        }
      }

      // add the data
      for (var ci = 0; ci < dataset.column_names.length; ci++) {
        var colName = dataset.column_names[ci];
        var colName_low = dataset.column_names[ci].toLowerCase();
        for (var ri = 0; ri < dataset.data.length; ri++) {
          var dt = dataset.data[ri][dateIdx];
          var val = dataset.data[ri][ci];
          tt.cached_datasets[symbol].data2[colName].put(dt, val);
        }
      }
      tt.eval_fn();
    };
  }

  data_source_error_cb(symbol) {
    var tt = this;
    return function(jqXHR) {
      tt.error_messages.push(symbol + ": " + jqXHR.responseText);
      tt.error_fn();
    };
  }
}

function rgb2hex(rgb) {
  if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;
  rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  function hex(x) {return ("0" + parseInt(x).toString(16)).slice(-2);}
  return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}
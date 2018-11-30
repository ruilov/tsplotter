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
      "FRED": "VALUE",
      "BOE": "Value",
      "MOODY": "VALUE",
      "STOCK": "adjusted close"
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

  get symbol_deps() {
    var formulas = this.formula_area.parsed_formulas;

    var symbols = {};
    var assignedSymbols = {}; // these are symbols that were assigned so we don't need to load

    for (var formula2 of formulas) {
      if (formula2.off) continue;
      var formula = formula2.text.trim();
      formula = formula.replace(String.fromCharCode(160), "");
      if (formula.length === 0) continue;

      var translated_formula = this.formula_translate(formula)
      formula2.text = translated_formula;
      var parsed_formula = math.parse(translated_formula);
      var thisSymbols = this.symbol_nodes(parsed_formula);
      for (var symbol of thisSymbols)
        if (!(symbol in assignedSymbols)) symbols[symbol] = 1;
      if (parsed_formula.type == "AssignmentNode") assignedSymbols[parsed_formula.name] = 1;
    }
    return Object.keys(symbols);
  }

  formula_translate(formula) {
    // First find the "strip"
    var strip_end = -1;
    var expr = /strip\(/;
    var strip_location = 0;
    var formula_new = " ";
    var strip_start = 0;
    
    if ( strip_location = formula.match(expr) ) {
      strip_start = strip_location.index;
      var quotes = 0;
      for ( r = strip_start; r < formula.length; r ++ ){
        if ( formula[r] == ")" && strip_end == -1 )
          strip_end = r+1;
      }
      var formula_extract = formula.substring( strip_start+6, strip_end-1 );

      // Then extract the relevant portions
      formula_new = String( formula_extract );
      var space = " ";
      var empty = "";
      while( formula_new.indexOf( space ) > -1 ) {
        formula_new = formula_new.replace( space, empty );
      };

      var Strip_inputs = Array( formula_new.split( "," ) );

      var preface = String( Strip_inputs[0][0] );
      var init_contract = String( Strip_inputs[0][1] );
      var N = Strip_inputs[0][2];
      //var Operator = String( Strip_inputs[0][3] );

      var month_codes   = ["F","G","H","J","K","M","N","Q","U","V","X","Z"]
      var symbol_month  = init_contract[0];
      var symbol_year   = init_contract.substring(1,5);

      for ( var n = 0; n < month_codes.length; n++ ){
        if ( month_codes[n] == symbol_month ){
          var month_location = n;
        }
      }

      var symbols_string = "(" + preface + init_contract;

      for (var r = 1; r < N; r++){
        if ( month_location == 11 ){
          month_location = 0;
          symbol_year ++;
        } else {
          month_location ++;
        }
        // symbols[ symbols.length ] = preface + month_codes[ month_location] + symbol_year;
        symbols_string += "+" + preface + month_codes[ month_location] + symbol_year;
      };
      symbols_string += ")/" + N;

      var formula_final = formula;
      var old_strip = formula.substring(strip_start, strip_end);
      var new_strip = symbols_string;
      while( formula_final.indexOf( old_strip ) > -1 ) {
        formula_final = formula_final.replace( old_strip, new_strip );
      };      
    } else {
      formula_final = formula;
    }
    return formula_final;
  };

  symbol_nodes(parsed_formula) {
    return parsed_formula.filter(x => 
      x.isSymbolNode && (parsed_formula.type != "AssignmentNode" || x.name != parsed_formula.name)
    ).map(x => x.name.replace("_dict", ""));
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

      var formulaText = formulas[fi].text.trim();
      formulaText = formulaText.replace(String.fromCharCode(160), "");
      var translated_formulaText = this.formula_translate(formulaText)
      formulaText = translated_formulaText.replace(String.fromCharCode(160), "");
      if (formulaText.length === 0) continue;

      // eval it
      var evaled;
      try {
        // populate the scope with cached data from quandl before evaluing
        this.populate_scope(formulaText);
        evaled = math.eval(formulaText, this.scope);
        if (evaled === null) throw formulaText + ": error evaluating series";
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
      
      var original_formulaText = formulas[fi].text.trim();
      original_formulaText = original_formulaText.replace(String.fromCharCode(160), "");
      var title = formulas[fi].title;
            if (!title) title = this.make_title(formulaText,original_formulaText);
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
  populate_scope(formula) {
    var parsed = math.parse(formula);
    var thisSymbols = this.symbol_nodes(parsed);
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

  make_title(formula,original) {
    var title = formula;

    var parsed = math.parse(formula);
    var thisSymbols = this.symbol_nodes(parsed);
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
    if (formula!=original) title = original;
    return title;
  }

  // QUANDL
  quandl_url(symbol) {
    if (symbol.indexOf("|") < 0) {
      this.error_messages.push(symbol + ": malformed database symbol");
      this.error_fn();
      return null;
    }

    var url = "https://www.quandl.com/api/v3/datasets/" + symbol.replace("|", "/").toUpperCase() + ".json?api_key=" + thePage.quandl_key;
    if (this.start_text.length > 0) url += "&start_date=" + this.start_text;
    if (this.end_text.length > 0) url += "&end_date=" + this.end_text;
    return url;
  }

  alphaadv_url(symbol) {
    var ticker = symbol.split("|")[1];  // guarantee to start with STOCK|
    return "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=" + ticker + "&outputsize=full&apikey=WI0Y0BUXESQK8GVT";
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
      } else {
        var url = this.quandl_url(symbol);
        if (!url) return; // means we couldn't parse the symbol
        console.log("calling: " + url);
        $.getJSON(url, this.quandl_success_cb(symbol)).error(this.data_source_error_cb(symbol));
      }
    }
    HTML.cursor_style("progress");

    this.eval_fn(); // in case there were not json calls
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
        if("Information" in retVal) errMsg += "<br>" + retVal["Information"]+"<br>";
        console.log(retVal);
        tt.error_messages.push(symbol + ": " + errMsg);
        tt.error_fn();
        return;
      }

      var dataset = retVal["Time Series (Daily)"];
      var col_names = Object.keys(Object.values(dataset)[0]).map(x => x.split(".")[1].trim())

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
        console.log(dataset.column_names);
        tt.error_messages.push(symbol + ": date column not found");
        tt.error_fn();
        return;
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
        for (var cn of dataset.column_names)
          tt.cached_datasets[symbol].data2[cn] = new Series();
      }

      // add the data
      for (var ci = 0; ci < dataset.column_names.length; ci++) {
        var colName = dataset.column_names[ci];
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
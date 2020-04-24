class Page {

  constructor() {
    this.formula_area = new FormulaArea();
    this.evaluator = new Evaluator(this.formula_area);

    var key_shortcuts = {
      "F9": () => this.f9_cb(),
      "CTRL+ALT+C": () => this.ctrl_alt_c(),
      "TAB": () => this.formula_area.ctrl_t_cb(),
      "CTRL+B": () => this.formula_area.ctrl_b_cb(),
      "CTRL+H": () => this.formula_area.ctrl_h_cb(),
      "CTRL+ALT+T": () => this.formula_area.ctrl_t_cb(),
      "CTRL+E": () => this.formula_area.ctrl_e_cb(),
      "CTRL+ALT+V": () => this.formula_area.ctrl_alt_v_cb(),
    };

    for (var sc in key_shortcuts) {
      shortcut.add(sc, key_shortcuts[sc]);
      this.formula_area.add_shortcut(sc,key_shortcuts[sc]);
    }
  }

  // to be called only once google chart modules are loaded
  init() {
    this.plot = new Plot();
    var qs = this.getUrlVars();
    if ("plot" in qs) this.b64_to_state(qs.plot);
  }

  // called by the customize button
  static customize_cb() {
    thePage.customize_cb();
  }

  static f9_cb() {
    thePage.f9_cb();
  }

  f9_cb() {
    HTML.hide_perma_link();
    HTML.show_chart();
    
    HTML.cursor_style("progress");
    this.evaluator.evaluate(f => this.plot.plot(f), HTML.show_error);
  }

  static ctrl_alt_c() {
    thePage.ctrl_alt_c();
  }

  ctrl_alt_c() {
    this.evaluator.evaluate(f => this.ctrl_alt_c_plot_callback(f), HTML.show_error);
  }

  ctrl_alt_c_plot_callback(formulas) {
    this.plot.plot(formulas);
    var [table,options] = this.plot.data_and_options(formulas,true);

    var table_str = "<table>";
    for(var row of table) {
      table_str += "<tr>";
      for(var cell of row) {
        if(cell instanceof Date) cell = dateToStr(cell); // dateToStr is defined in series.js
        if(cell === null) cell = "";
        table_str += "<td>" + cell + "</td>";
      }
      table_str += "</tr>\n";
    }
    table_str += "</table>";

    this.copyToClipboard(table_str);
  }

  copyToClipboard(str) {
    const el = document.createElement('textarea');  // Create a <textarea> element
    el.value = str;                                 // Set its value to the string that you want copied
    el.setAttribute('readonly', '');                // Make it readonly to be tamper-proof
    el.style.position = 'absolute';                 
    el.style.left = '-9999px';                      // Move outside the screen to make it invisible
    document.body.appendChild(el);                  // Append the <textarea> element to the HTML document
    const selected = document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;                                    
    el.select();                                    // Select the <textarea> content
    document.execCommand('copy');                   // Copy - only works as a result of a user action (e.g. click events)
    document.body.removeChild(el);                  // Remove the <textarea> element
    if (selected) {                                 // If a selection existed before copying
      document.getSelection().removeAllRanges();    // Unselect everything on the HTML document
      document.getSelection().addRange(selected);   // Restore the original selection
    }
  }

  customize_cb() {
    this.plot.display_editor();
  }

  get state() {
    var ans = {};
    var s = this.plot.state;
    for (var k in s) {ans[k] = s[k];}
    s = this.formula_area.state;
    for (k in s) {ans[k] = s[k];}
    s = this.evaluator.state;
    for (k in s) {ans[k] = s[k];}
    return ans;
  }

  set state(state) {
    this.plot.state = state;
    this.formula_area.state = state;
    this.evaluator.state = state;
  }

  get_key(type) {
    var keys = {
      "quandl": [106, 118, 53, 103, 83, 75, 113, 95, 45, 85, 98, 66, 55, 113, 113, 111, 116, 120, 72, 54],
      "alphaadvantage": [87, 73, 48, 89, 48, 66, 85, 88, 69, 83, 81, 75, 56, 71, 86, 84],
      "rebrandly": [50, 57, 57, 97, 49, 57, 49, 51, 50, 48, 56, 48, 52, 100, 53, 52, 98, 97, 51, 97, 52, 99, 54, 54, 98, 52, 56, 57, 98, 48, 56, 98],
      "fred": [97, 102, 100, 57, 49, 54, 97, 53, 98, 51, 51, 48, 57, 51, 53, 102, 48, 101, 102, 51, 101, 53, 50, 57, 101, 54, 56, 57, 50, 97, 98, 48],
    }

    var ans = String.fromCharCode.apply(null,keys[type]);
    return ans;
  }


  make_permalink() {
    var state = this.state;
    delete state.additional_scope; // this is too much data to put on a URL
    var json = JSON.stringify(state);
    var b64 = btoa(json);
    b64 = encodeURIComponent(b64);
    var url = window.location.protocol + "//" + window.location.host + window.location.pathname + "?plot=" + b64;
    return url;
  }

  // Read a page's GET URL variables and return them as an associative array.
  getUrlVars() {
    var vars = [],
      hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  }

  b64_to_state(b64) {
    var decoded = decodeURIComponent(b64);
    var json = atob(decoded);
    var parsed = JSON.parse(json);
    this.state = parsed;
    this.f9_cb();
  }
}
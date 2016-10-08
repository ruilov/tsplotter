class Page {

  constructor() {
    this.formula_area = new FormulaArea();
    this.evaluator = new Evaluator(this.formula_area);

    var key_shortcuts = {
      "F9": () => this.f9_cb(),
      "TAB": () => this.formula_area.ctrl_t_cb(),
      "CTRL+B": () => this.formula_area.ctrl_b_cb(),
      "CTRL+H": () => this.formula_area.ctrl_h_cb(),
      "CTRL+ALT+T": () => this.formula_area.ctrl_t_cb(),
      "CTRL+E": () => this.formula_area.ctrl_e_cb(),
      "CTRL+ALT+C": () => this.formula_area.ctrl_alt_c_cb(),
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
    HTML.hide_key_warning();
    HTML.hide_perma_link();
    HTML.show_chart();
    
    if(this.quandl_key === "") {
      HTML.show_key_warning();
      return;
    }

    HTML.cursor_style("progress");
    this.evaluator.evaluate(f => this.plot.plot(f), HTML.show_error);
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

  get quandl_key() {
    var quandl_api_key = localStorage.quandl_key;
    if (typeof(quandl_api_key) == "undefined" || quandl_api_key === null) quandl_api_key = "";
    // localStorage.removeItem("quandl_key");
    return quandl_api_key;
  }

  set state(state) {
    this.plot.state = state;
    this.formula_area.state = state;
    this.evaluator.state = state;
  }

  set quandl_key(key) {
    localStorage.setItem("quandl_key", key);
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
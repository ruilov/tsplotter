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
    HTML.hide_perma_link();
    HTML.show_chart();
    
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
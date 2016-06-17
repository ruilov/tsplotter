class FormulaArea {

  // ===== CONSTRUCTION ======
  constructor() {
    var tt = this;
    $("#formula_area").cleditor({
      controls: 'color',
      width: '99%',
      bodyStyle: "font: 18px Lucida Grande",
      color_cb: function(color) {
        tt.color_cb(color);
      },
    });
    this.add_shortcuts();
  }

  add_shortcuts() {
    var tt = this;
    var key_shortcuts = {
      "F9": function() {Page.f9_cb();},
      "TAB": function() {tt.ctrl_t_cb();},
      "CTRL+B": function() {tt.ctrl_b_cb();},
      "CTRL+H": function() {tt.ctrl_h_cb();},
      "CTRL+T": function() {tt.ctrl_t_cb();},
      "CTRL+E": function() {tt.ctrl_e_cb();},
      "CTRL+ALT+C": function() {tt.ctrl_alt_c_cb();},
    };
    for (var sc in key_shortcuts) {
      shortcut.add(sc, key_shortcuts[sc]);
      shortcut.add(sc, key_shortcuts[sc], {
        'target': this.formula_editor.doc
      });
    }
  }

  // ===== GETTERS ======

  get state() {
    return {
      "parsed_formulas": this.parsed_formulas
    };
  }

  get formula_editor() {
    return $("#formula_area").cleditor()[0];
  }

  get inner_body() {
    return this.formula_editor.doc.getElementById("inner_body");
  }

  get inner_text() {
    return this.formula_editor.$area[0].value;
  }

  get parsed_formulas() {
    this.cursor_set = false;
    var ans = this.parse_body_html(this.inner_body);
    this.cursor_set = false;
    return ans;
  }

  // recursirvely parse the body html
  parse_body_html(node) {
    var tag = node.nodeName.toLowerCase();
    var props = {};

    if (node == this.cursor_start_container) this.cursor_set = true;
    if (this.cursor_set) props.cursor = true;
    if (node == this.cursor_end_container) this.cursor_set = false;

    if (tag == "span") {
      if (node.style.color.length > 0) props.color = node.style.color;
      if (node.style["text-decoration"] == "line-through") props.off = true;
      if (node.style["font-style"] == "italic") props.hidden = true;
      if (node.style.whiteSpace == "pre") props.rhs = true;
    } else if (tag == "i") props.hidden = true;
    else if (tag == "strike") props.off = true;

    var childrenParsed = [];
    for (var ni = 0; ni < node.childNodes.length; ni++) {
      var child = node.childNodes[ni];
      var childParsed = this.parse_body_html(child);
      if (childParsed instanceof Array) {
        childrenParsed = childrenParsed.concat(childParsed);
      } else if (tag == "body") {
        childrenParsed.push(childParsed);
      } else {
        // if children is not an array, then this must be a div node. Take the union of the child properties
        for (var p in childParsed) props[p] = childParsed[p];
      }
    }

    // this is a parent div node
    if (childrenParsed.length > 0) return childrenParsed;

    props.text = node.textContent;
    if (tag == "div" && props.text.length && props.text.charCodeAt(0) == 160) props.rhs = true;
    props.text = props.text.trim();
    var parts = props.text.split(";");
    if (parts.length > 1) {
      props.text = parts[0];
      props.title = parts[1];
    }

    // this is a child div node
    if (tag == "div") return [props];

    // this is the child of a div node
    return props;
  }

  get winSelection() {
    return this.formula_editor.doc.defaultView.getSelection();
  }

  get selectionRange() {
    var selection = this.winSelection;
    var offset = null;
    var container = null;
    if (selection.rangeCount) return selection.getRangeAt(0);
    return null;
  }

  get cursor_start_container() {
    if (this.selectionRange) return this.selectionRange.startContainer;
    return null;
  }

  get cursor_end_container() {
    if (this.selectionRange) return this.selectionRange.endContainer;
    return null;
  }

  get cursor_start_offset() {
    if (this.selectionRange) return this.selectionRange.startOffset;
    return null;
  }

  get cursor_end_offset() {
    if (this.selectionRange) return this.selectionRange.endOffset;
    return null;
  }

  // ===== SETTERS ======

  set state(state) {
    if ("parsed_formulas" in state) this.parsed_formulas = state.parsed_formulas;
  }

  set parsed_formulas(parsed) {
    var start_offset = this.cursor_start_offset;
    var end_offset = this.cursor_end_offset;

    this.inner_body.innerHTML = this.make_html(parsed);

    var cursor_lines = [];
    for (var i = 0; i < parsed.length; i++)
      if (parsed[i].cursor) cursor_lines.push(i);

    var start_line = _.min(cursor_lines);
    var end_line = _.max(cursor_lines);
    this.setCursorOffset(start_line, start_offset, end_line, end_offset);
  }

  make_html(parsed) {
    var html = "";
    for (var line of parsed) {
      var this_html = line.text.trim();
      this_html = this_html.replace("<", "&lt;").replace(">", "&gt;");
      if (this_html.length === 0) this_html = "<br>";
      // if(line.rhs) this_html = String.fromCharCode(160,160,160,160,160,160,160) + this_html;
      if (line.rhs) this_html = '<span class="Apple-tab-span" style="white-space:pre">    </span>' + this_html;
      if (line.title) this_html += ";" + line.title;
      if (line.color) this_html = '<span style="color: ' + line.color + ';">' + this_html + "</span>";
      if (line.off) this_html = '<strike>' + this_html + "</strike>";
      if (line.hidden) this_html = '<i>' + this_html + "</i>";
      this_html = "<div>" + this_html + "</div>";
      html += this_html;
    }
    return html;
  }

  lineNumContainer(container, line_num) {
    var count = 0;
    while (true) {
      count += 1;
      if (count > 100) throw "ERROR";
      var tag = container.nodeName.toLowerCase();
      if (tag != "#text") {
        if (container.childNodes.length === 0) return null; // empty line
        if (tag == "body") container = container.childNodes[line_num];
        else container = container.childNodes[container.childNodes.length - 1];
      } else break;
    }
    return container;
  }

  setCursorOffset(start_line, start_offset, end_line, end_offset) {
    if (start_offset === null || end_offset === null || this.cursor_start_container === null || this.cursor_end_container === null) return;

    var newSC = this.lineNumContainer(this.cursor_start_container, start_line);
    if (newSC === null) return;
    var newEC = this.lineNumContainer(this.cursor_end_container, end_line);
    if (newEC === null) return;

    var range2 = this.formula_editor.doc.createRange();
    range2.setStart(newSC, start_offset);
    range2.setEnd(newEC, end_offset);
    this.winSelection.removeAllRanges();
    this.winSelection.addRange(range2);
  }

  // ===== KEY STROKE CALLBACKS ======

  generic_formula_area_cb(onlyCursor, transform) {
    var parsed = this.parsed_formulas;
    for (var obj of parsed)
      if (!onlyCursor || obj.cursor) transform(obj);
    this.parsed_formulas = parsed;
  }

  ctrl_b_cb() {
    this.generic_formula_area_cb(true, function(x) {
      if (x.off) x.off = false;
      else x.off = true;
    });
  }

  ctrl_h_cb() {
    this.generic_formula_area_cb(true, function(x) {
      if (x.hidden) x.hidden = false;
      else x.hidden = true;
    });
  }

  ctrl_t_cb() {
    this.generic_formula_area_cb(true, function(x) {
      if (x.rhs) x.rhs = false;
      else x.rhs = true;
    });
  }

  // this is called when the user pressed the color chooser button and selects a color
  color_cb(color) {
    this.generic_formula_area_cb(true, function(x) {
      x.color = color;
    });
  }

  ctrl_alt_c_cb() {
    this.generic_formula_area_cb(false, function(x) {
      x.color = false;
    });
  }

  ctrl_e_cb() {
    console.log(this.inner_text);
    var parsed = this.parsed_formulas;
    console.log(parsed);
    console.log(parsed[0].text.charCodeAt(0));
    console.log(JSON.stringify(parsed, null, "\t"));
  }
}
class HTML {

  static init() {
    HTML.make_layout();
    HTML.make_file_load_button();
    HTML.bind_paste_event(IO.parse_excel_data);
  }

  // creates the layout of the page with the various frames
  static make_layout() {
    $('body').layout({
      livePaneResizing: true,
      north: {size: 35, spacing_open: 0, closable: false}, // spacing_open hides the resizing bar
      south: {size: 270, spacing_open: 5, closable: false},
      center: {},
    });
  }

  static make_file_load_button() {
    $(document.getElementById('file_load_button')).on('click', function() {
      $('#file_load').click();
      return false;
    });
    document.getElementById('file_load').addEventListener('change', IO.file_load_button_cb, false);
  }

  static bind_paste_event(cb) {
    $("html").bind("paste", function(e) {
      e.preventDefault();
      if(e.originalEvent.clipboardData){
        var text = e.originalEvent.clipboardData.getData("text/plain");
        cb(text);
      }
    });
  }

  static chart_elem() {
    return document.getElementById("thePlot");
  }

  static position_chart(chartType) {
    if(chartType!="Table") HTML.chart_elem().style.marginTop = "-30px";
    else HTML.chart_elem().style.marginTop = "5px";
  }

  static perma_link_elem() {
    return document.getElementById("perma_link");
  }

  static start_date_elem() {
    return document.getElementById("start-date");
  }

  static end_date_elem() {
    return document.getElementById("end-date");
  }

  static _error_message_elem() {
    return document.getElementById("error_message");
  }

  static cursor_style(style) {
    $('body').css("cursor",style);
  }

  static show_error(message) {
    var chart = HTML.chart_elem();
    chart.style.visibility = "hidden";
    var errMsg = HTML._error_message_elem();
    errMsg.style.visibility = "visible";
    errMsg.innerHTML = message;
    HTML.cursor_style("default");
  }

  static show_chart() {
    var chart = HTML.chart_elem();
    chart.style.visibility = "visible";
    var errMsg = HTML._error_message_elem();
    errMsg.style.visibility = "hidden";
  }

  static show_perma_link(permalink) {
    var elem = HTML.perma_link_elem();
    elem.innerHTML = permalink;
    elem.style.visibility = "visible";
  }

  static hide_perma_link(permalink) {
    var elem = HTML.perma_link_elem();
    elem.style.visibility = "hidden";
  }
}

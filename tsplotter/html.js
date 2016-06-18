class HTML {

  static init() {
    HTML.make_layout();
    HTML.make_file_load_button();
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
    document.getElementById('file_load').addEventListener('change', file_load_button_cb, false);
  }

  static chart_elem() {
    return document.getElementById("thePlot");
  }

  static position_chart(chartType) {
    if(chartType=="table") HTML.chart_elem().style.marginTop = "-30px";
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

  static show_error(message) {
    var chart = HTML.chart_elem();
    chart.style.visibility = "hidden";
    var errMsg = HTML._error_message_elem();
    errMsg.style.visibility = "visible";
    errMsg.innerHTML = message;
  }

  static show_chart() {
    var chart = HTML.chart_elem();
    chart.style.visibility = "visible";
    var errMsg = HTML._error_message_elem();
    errMsg.style.visibility = "hidden";
  }

  static show_key_warning() {
    var elem = document.getElementById("key_warning");
    elem.innerHTML = "To use tsplotter you need a <a href=\"tsplotter/user_manual.html#key\">quandl</a> account.";
    elem.style.visibility = "visible";
  }

  static hide_key_warning() {
    var elem = document.getElementById("key_warning");
    elem.style.visibility = "hidden";
  }
}

// creates the layout of the page with the various frames
function make_layout() {
  $('body').layout({
    livePaneResizing: true,
    north: {size: 35, spacing_open: 0, closable: false}, // spacing_open hides the resizing bar
    south: {size: 270, spacing_open: 5, closable: false},
    center: {},
  });
};

function show_error(message) {
  var chart = chart_elem();
  chart.style.visibility = "hidden";
  var errMsg = error_message_elem();
  errMsg.style.visibility = "visible";
  errMsg.innerHTML = message;
};

function show_chart() {
  var chart = chart_elem();
  chart.style.visibility = "visible";
  var errMsg = error_message_elem();
  errMsg.style.visibility = "hidden";
};

function show_key_warning(calls) {
  var elem = document.getElementById("key_warning");
  elem.innerHTML = "Warning! You have " + Math.max(50-calls,0) + "/50 quandl calls left today. " +
  "Please consider creating a <a href=\"tsplotter/user_manual.html#key\">quandl</a> account.";
  elem.style.visibility = "visible";
};

function hide_key_warning() {
  var elem = document.getElementById("key_warning");
  elem.style.visibility = "hidden";
};

function chart_elem() {
  return document.getElementById("thePlot");
};

function error_message_elem() {
  return document.getElementById("error_message");
};

function perma_link_elem() {
  return document.getElementById("perma_link");
};

// if includeDates, the first column will be the dates, otherwise the data table won't have the dates at all
function construct_data_table(formulas,includeDates) {
  var chartOptions = thePlot.getOptions();
  // sigh...even when the user cancels in charteditor, the options are already modified
  // so we have to delete width and height no matter what!
  delete chartOptions.width;
  delete chartOptions.height;

  chartOptions.series = {};

  // construct the headers. Note that this will modify chartOptions
  var headers = ["Date"];
  var fi_adder = 0;
  if(!includeDates) fi_adder = 1;

  var formulas_filtered = [];

  for(var fi = 0; fi < formulas.length; fi++) {
    var formula = formulas[fi];
    
    if(formula.evaled.isEmpty()) {
      fi_adder += 1;
      continue;
    };

    chartOptions.series[fi-fi_adder] = {color: formula.color};
    if(!includeDates) chartOptions.series[fi-fi_adder].pointSize = 2;
    if(formula.rhs) {
      formula.display_title = "(rhs) " + formula.display_title;
      chartOptions.series[fi-fi_adder].targetAxisIndex = 1;
    };
    headers.push(formula.display_title);
    formulas_filtered.push(formula);
  };
  formulas = formulas_filtered;
  var table = [headers];

  // gather all dates
  if(formulas.length>0) {
    var all_xs = formulas.map(function(x) {return Object.keys(x.evaled.map)});
    all_xs = _.uniq(_.flatten(all_xs));
    all_xs = all_xs.map(formulas[0].evaled.parse_func());
    all_xs.sort(function(a,b) {return a-b;});

    // make the table
    var toStr_func = formulas[0].evaled.toStr_func();
    for(var x of all_xs) {
      var elem = formulas.map(function(f) {return f.evaled.getX(toStr_func(x))});
      elem.splice(0,0,x);
      table.push(elem);
    };
  };

  // remove the dates if needed
  if(!includeDates) table = table.map(function(x) {return x.slice(1)});
  return [table,chartOptions];
  
};

function draw_the_plot(dataArr,chartOptions) {
  var dataTable = google.visualization.arrayToDataTable(dataArr);
  $(chart_elem()).show();
  thePlot.setDataTable(dataTable);

  if("hAxis" in chartOptions) {
    hAxis = chartOptions.hAxis;
    hAxis.viewWindowMode="explicit";
    hAxis.viewWindow = {};
    if("minValue" in hAxis) hAxis.viewWindow.min = hAxis.minValue;
    if("maxValue" in hAxis) hAxis.viewWindow.max = hAxis.maxValue;
  };

  thePlot.setOptions(chartOptions);
  thePlot.draw();
  permalink = make_permalink();
};

// f9 callback when the chart_choice is series
function plot_as_line(formulas) {
  var [table,chartOptions] = construct_data_table(formulas,true);
  if("hAxis" in chartOptions) delete chartOptions.hAxis.title;
  draw_the_plot(table,chartOptions);
};

// f9 callback when the chart_choice is histogram
function plot_as_histogram(formulas) {
  var [table,chartOptions] = construct_data_table(formulas,true);
  for(var ri = 1; ri < table.length; ri++)  { // start at 1 to skip the headers
    table[ri][0] = valueToStr(table[ri][0]);
  };
  if("hAxis" in chartOptions) delete chartOptions.hAxis.title;
  draw_the_plot(table,chartOptions);
};

// f9 callback when the chart_choice is scatter
function plot_as_scatter(formulas) {
  if(formulas.length<2) {
    show_error("scatter plot needs at least 2 series");
    return;
  };

  var [table,chartOptions] = construct_data_table(formulas,false);
  if(!("hAxis" in chartOptions)) chartOptions.hAxis = {}
  chartOptions.hAxis.title = formulas[0].display_title;
  draw_the_plot(table,chartOptions);
};

function plot_as_table(formulas) {
  var [table,chartOptions] = construct_data_table(formulas,true);

  // reverse except for the header
  var data = table.slice(1);
  data.sort(function(a,b) {return b[0]-a[0]});
  data.splice(0,0,table[0]);

  chartOptions.width = "100%";
  chartOptions.height = "100%";
  draw_the_plot(data,chartOptions);
};

// f9_cb continuation
function plot_chart(formulas) {
  // HACK ALERT (I think...javacsript+html is so bad, this may be the gold standard)
  chart_elem().style.marginTop = "-30px";
  var chart_type = thePlot.getChartType();

  if(chart_type=="ScatterChart") plot_as_scatter(formulas);
  else if(chart_type=="Histogram") plot_as_histogram(formulas);
  else if(chart_type=="Table") {
    chart_elem().style.marginTop = "5px";
    plot_as_table(formulas);
  } else plot_as_line(formulas);
};

// handles the customize button
function handleCustomizeButton() {
  chartEditor.openDialog(thePlot, {});
  // bootstrap messed up the google chart editor. hack to fix it
  var elem = $(".modal-dialog");
  elem.width(elem.width()*1.1);
  elem.height(elem.height()*1.1);
  var off = elem.offset();
  off.left -= 50;
  off.top -= 70;
  elem.offset(off);
};

function set_options(options,do_f9) {
  if(typeof(do_f9)=="undefined") do_f9 = true;

  delete options.width;
  delete options.height;
  for(var key in default_chart_options)
    options[key] = default_chart_options[key];
  thePlot.setOptions(options);

  if(do_f9) f9_cb();
};

// callback from the customize buttom
function customize_ok(){
  var editorPlot = chartEditor.getChartWrapper();
  var chart_type = editorPlot.getChartType();
  thePlot.setChartType(chart_type);

  var options = editorPlot.getOptions();
  // console.log(options);
  set_options(options);
};

function f9_cb() {
  show_chart();
  hide_key_warning();
  evaluator.evaluate(plot_chart,show_error);
};

function handlePerma() {
  var errMsg = error_message_elem();
  if(errMsg.style.visibility!="hidden") {
    window.alert("please plot a valid chart");
    return;
  };

  var chart = chart_elem();
  chart.style.visibility = "hidden";
  
  // show, select, copy
  var perma = perma_link_elem();
  perma.style.visibility = "visible";
  perma.innerHTML = permalink;
  // console.log(permalink);
  var range = document.createRange();
  range.selectNode(perma);

  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  document.execCommand('copy');

  // put it back
  chart.style.visibility = "visible";
  perma.style.visibility = "hidden";
};

function handleSearch() {
  var term = document.getElementById("search-box").value;
  term = encodeURIComponent(term);
  var url = "https://www.quandl.com/search?query=" + term + "&type=free";
  var win = window.open(url, '_blank');
  win.focus();
};

function handleHelp() {
  var url = "tsplotter/user_manual.html";
  var win = window.open(url, '_blank');
  win.focus();
};

// called after google charts and jquery DOM are ready
function init() {
  websocket_connect("9002");  // used for sending data programatic
  // websocket_connect("9001");  // used for file saving, but opens on demand

  thePlot = new google.visualization.ChartWrapper({containerId: "thePlot"});
  thePlot.setChartType("LineChart");  
  thePlot.setOptions(Object.assign({},default_chart_options)); // google charts do bad things to objects. Pass a copy.
  chartEditor = new google.visualization.ChartEditor();
  google.visualization.events.addListener(chartEditor, 'ok', customize_ok);

  var qs = getUrlVars();
  if("plot" in qs) b64_to_state(qs.plot);
};

/*
* EXECUTION STARTS HERE
*/
var thePlot = null;
var chartEditor = null;
var permalink = "";

var default_chart_options = {
  legend: { position: 'bottom'},
  interpolateNulls: true,
  vAxis: [0, 1],
  series: {},
  explorer: { 
    actions: ['dragToZoom', 'rightClickToReset'],
    axis: 'horizontal',
    keepInBounds: true,
  },
  vAxis: {viewWindowMode: 'maximized'},
  chartArea: {width: '90%', height: '80%'}
};

$(document).ready(function () {
  quandl_api_key = localStorage.quandl_key;
  if(typeof(quandl_api_key)=="undefined" || quandl_api_key==null) quandl_api_key = "";
  // localStorage.removeItem("quandl_key");
  
  make_layout();
  $(document.getElementById('file_load_button')).on('click', function() { 
    $('#file_load').click(); return false;
  });
  document.getElementById('file_load').addEventListener('change', handleFileLoad, false);

  formula_area = new FormulaArea();
  evaluator = new Evaluator(formula_area);

  google.charts.load('current', {
    'packages': ['charteditor'],
    'callback': init
  });
});
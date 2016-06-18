class Plot {
  static get default_options() {
    return {
      legend: {position: 'bottom'},
      interpolateNulls: true,
      explorer: {
        actions: ['dragToZoom', 'rightClickToReset'],
        axis: 'horizontal',
        keepInBounds: true,
      },
      vAxis: {viewWindowMode: 'maximized'},
      chartArea: {width: '90%', height: '80%'}
    };
  }

  constructor() {
    this.googlePlot = new google.visualization.ChartWrapper({containerId: "thePlot"});
    this.googlePlot.setChartType("LineChart");
    this.googlePlot.setOptions(Object.assign({}, Plot.default_options)); // google charts do bad things to objects. Pass a copy.
    this.chartEditor = new google.visualization.ChartEditor();
    google.visualization.events.addListener(this.chartEditor, 'ok', () => this.chart_editor_cb());
  }

  get state() {
    var state = {
      "chart_type": this.googlePlot.getChartType(),
      "chart_options": this.googlePlot.getOptions(),
    };
    return state;
  }

  set state(state) {
    if ("chart_type" in state) this.googlePlot.setChartType(state.chart_type);
    if ("chart_options" in state) this.set_options(state.chart_options);
  }

  // called when the user presses ok in the chart editor
  chart_editor_cb() {
    var editorPlot = this.chartEditor.getChartWrapper();
    this.googlePlot.setChartType(editorPlot.getChartType());
    this.set_options(editorPlot.getOptions());
    Page.f9_cb();
  }

  add_default_options() {
    var options = this.googlePlot.getOptions();
    for(var opt in Plot.default_options) options[opt] = Plot.default_options[opt];
    this.googlePlot.setOptions(options);
  }

  set_options(options) {
    if(this.googlePlot.getChartType()!="Table") {
      delete options.width; // note that the editor also messes up with width and height, so we usually should delete them
      delete options.height;
    }
    this.googlePlot.setOptions(options);
  }

  // handles the customize button
  display_editor() {
    this.chartEditor.openDialog(this.googlePlot, {});
    // bootstrap messed up the google chart editor. hack to fix it
    var elem = $(".modal-dialog");
    elem.width(elem.width() * 1.1);
    elem.height(elem.height() * 1.1);
    var off = elem.offset();
    off.left -= 50;
    off.top -= 70;
    elem.offset(off);
  }

  plot(formulas) {
    var chart_type = this.googlePlot.getChartType();
    HTML.position_chart(chart_type);
    
    if (chart_type == "ScatterChart") this.plot_as_scatter(formulas);
    else if (chart_type == "Histogram") this.plot_as_histogram(formulas);
    else if (chart_type == "Table") this.plot_as_table(formulas);
    else this.plot_as_line(formulas);
  }

  // f9 callback when the chart_choice is series
  plot_as_line(formulas) {
    var [table, chartOptions] = this.data_and_options(formulas, true);
    if ("hAxis" in chartOptions) delete chartOptions.hAxis.title; // delete haxis title that scatter plots may have added
    this.draw(table, chartOptions);
  }

  // f9 callback when the chart_choice is histogram
  plot_as_histogram(formulas) {
    var [table, chartOptions] = this.data_and_options(formulas, true);
    for (var ri = 1; ri < table.length; ri++) { // start at 1 to skip the headers
      table[ri][0] = valueToStr(table[ri][0]);
    }
    if ("hAxis" in chartOptions) delete chartOptions.hAxis.title;
    this.draw(table, chartOptions);
  }

  // f9 callback when the chart_choice is scatter
  plot_as_scatter(formulas) {
    if (formulas.length < 2) {
      HTML.show_error("scatter plot needs at least 2 series");
      return;
    }

    var [table, chartOptions] = this.data_and_options(formulas, false);
    if (!("hAxis" in chartOptions)) chartOptions.hAxis = {};
    chartOptions.hAxis.title = formulas[0].display_title;
    for(var col in chartOptions.series) chartOptions.series[col].pointSize = 2;

    this.draw(table, chartOptions);
  }

  plot_as_table(formulas) {
    var [table, chartOptions] = this.data_and_options(formulas, true);

    // reverse except for the header
    var data = table.slice(1);
    data.sort(function(a, b) {return b[0] - a[0];});
    data.splice(0, 0, table[0]);
    chartOptions.width = "100%";
    chartOptions.height = "100%";
    this.draw(data, chartOptions);
  }

  draw(data, chartOptions) {
    var dataTable = google.visualization.arrayToDataTable(data);
    this.googlePlot.setDataTable(dataTable);

    if ("hAxis" in chartOptions) {
      var hAxis = chartOptions.hAxis;
      hAxis.viewWindowMode = "explicit";
      hAxis.viewWindow = {};
      if ("minValue" in hAxis) hAxis.viewWindow.min = hAxis.minValue;
      if ("maxValue" in hAxis) hAxis.viewWindow.max = hAxis.maxValue;
    }

    this.set_options(chartOptions);
    this.googlePlot.draw();
    HTML.cursor_style("default");
  }

  // if includeDates=True, the first column will be the dates, otherwise the data table won't have the dates at all
  data_and_options(formulas, includeDates) {
    var chartOptions = this.googlePlot.getOptions();

    chartOptions.series = {};
    formulas = _.filter(formulas, x => !x.evaled.isEmpty());
    for (var fi = 0; fi < formulas.length; fi++) {
      chartOptions.series[fi] = {color: formulas[fi].color};
      if (formulas[fi].rhs) {
        formulas[fi].display_title = "(rhs) " + formulas[fi].display_title;
        chartOptions.series[fi].targetAxisIndex = 1;
      }
    }

    var headers = ["Date"].concat(formulas.map(x => x.display_title));
    var table = [headers];

    if (formulas.length > 0) {
      // gather all x values
      var all_xs = formulas.map(x => Object.keys(x.evaled.map));
      all_xs = _.uniq(_.flatten(all_xs));
      all_xs = all_xs.map(formulas[0].evaled.parse_func());
      all_xs.sort((a,b) => a-b);

      // make the table
      var toStr_func = formulas[0].evaled.toStr_func();
      var getter = f => f.evaled.getX(toStr_func(x));
      for (var x of all_xs) table.push([x].concat(formulas.map(getter)));
    }

    // remove the dates if needed
    if (!includeDates) {
      table = table.map(x => x.slice(1));
      for(fi = 0; fi < formulas.length-1; fi++) 
        chartOptions.series[fi]  = chartOptions.series[fi+1];
    }
    return [table, chartOptions];
  }
}
class Plot {
  static get default_options() {
    return {
      legend: {
        position: 'bottom'
      },
      interpolateNulls: true,
      series: {},
      explorer: {
        actions: ['dragToZoom', 'rightClickToReset'],
        axis: 'horizontal',
        keepInBounds: true,
      },
      vAxis: {
        viewWindowMode: 'maximized'
      },
      chartArea: {
        width: '90%',
        height: '80%'
      }
    };
  }

  constructor() {
    this.googlePlot = new google.visualization.ChartWrapper({
      containerId: "thePlot"
    });
    this.googlePlot.setChartType("LineChart");
    this.googlePlot.setOptions(Object.assign({}, Plot.default_options)); // google charts do bad things to objects. Pass a copy.
    this.chartEditor = new google.visualization.ChartEditor();

    var tt = this;
    google.visualization.events.addListener(this.chartEditor, 'ok', function() {
      tt.chart_editor_cb();
    });
  }

  // called when the user presses ok in the chart editor
  chart_editor_cb() {
    var editorPlot = this.chartEditor.getChartWrapper();
    var chart_type = editorPlot.getChartType();
    this.googlePlot.setChartType(chart_type);
    var options = editorPlot.getOptions();
    this.set_options(options);
    Page.f9_cb();
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

  set_options(options) {
    delete options.width;
    delete options.height;
    for (var key in Plot.default_options)
      options[key] = Plot.default_options[key];
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

  // HACK ALERT (I think...javacsript+html is so bad, this may be the gold standard)
  plot(formulas) {
    HTML.chart_elem().style.marginTop = "-30px";

    var chart_type = this.googlePlot.getChartType();
    if (chart_type == "ScatterChart")
      this.plot_as_scatter(formulas);
    else if (chart_type == "Histogram")
      this.plot_as_histogram(formulas);
    else if (chart_type == "Table") {
      HTML.chart_elem().style.marginTop = "5px";
      this.plot_as_table(formulas);
    } else
      this.plot_as_line(formulas);
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

  // if includeDates=True, the first column will be the dates, otherwise the data table won't have the dates at all
  data_and_options(formulas, includeDates) {
    var chartOptions = this.googlePlot.getOptions();
    // sigh...even when the user cancels in charteditor, the options are already modified
    // so we have to delete width and height no matter what!
    delete chartOptions.width;
    delete chartOptions.height;

    chartOptions.series = {};

    // construct the headers. Note that this will modify chartOptions
    var headers = ["Date"];

    var fi_adder = 0;
    if (!includeDates) fi_adder = 1; // in this case series 0 is really the 2nd formula. The 1st formula is the x-axis.
    var formulas_filtered = [];
    for (var fi = 0; fi < formulas.length; fi++) {
      var formula = formulas[fi];
      if (formula.evaled.isEmpty()) {
        fi_adder += 1;
        continue;
      }

      chartOptions.series[fi - fi_adder] = {
        color: formula.color
      };
      if (!includeDates) chartOptions.series[fi - fi_adder].pointSize = 2; // fixme: this doesn't belong here!
      if (formula.rhs) {
        formula.display_title = "(rhs) " + formula.display_title;
        chartOptions.series[fi - fi_adder].targetAxisIndex = 1;
      }
      headers.push(formula.display_title);
      formulas_filtered.push(formula);
    }

    formulas = formulas_filtered;
    var table = [headers];

    // gather all dates
    if (formulas.length > 0) {
      var all_xs = formulas.map(function(x) {
        return Object.keys(x.evaled.map);
      });
      all_xs = _.uniq(_.flatten(all_xs));
      all_xs = all_xs.map(formulas[0].evaled.parse_func());
      all_xs.sort(function(a, b) {
        return a - b;
      });

      // make the table
      var toStr_func = formulas[0].evaled.toStr_func();
      for (var x of all_xs) {
        var elem = formulas.map(function(f) {
          return f.evaled.getX(toStr_func(x));
        });
        elem.splice(0, 0, x);
        table.push(elem);
      }
    }

    // remove the dates if needed
    if (!includeDates) table = table.map(function(x) {
      return x.slice(1);
    });
    return [table, chartOptions];
  }

  draw(table, chartOptions) {
    $(HTML.chart_elem()).show();

    var dataTable = google.visualization.arrayToDataTable(table);
    this.googlePlot.setDataTable(dataTable);

    if ("hAxis" in chartOptions) {
      var hAxis = chartOptions.hAxis;
      hAxis.viewWindowMode = "explicit";
      hAxis.viewWindow = {};
      if ("minValue" in hAxis) hAxis.viewWindow.min = hAxis.minValue;
      if ("maxValue" in hAxis) hAxis.viewWindow.max = hAxis.maxValue;
    }

    this.googlePlot.setOptions(chartOptions);
    this.googlePlot.draw();
  }
}
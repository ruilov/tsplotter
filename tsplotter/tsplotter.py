import os,webbrowser,json,platform,collections,pandas
import datetime
import tsplotter.websocket_server
from lib.myseries import MySeries
from tsplotter.websocket_server import WebsocketServer

class Plotter:
  isOpen = False

  def __init__(self):
    if Plotter.isOpen: raise Exception("can only open one plotter at a time. Close other open plotters first.")

    websocket_server.VERBOSE = False
    self.server = WebsocketServer(9002)
    self.server.set_fn_new_client(lambda client,server: self.new_client(client,server))
    
    self.start = None
    self.end = None
    self.chart_type = None
    self.chart_options = None
    self.formulas = None
    self.plots = {}
    self.series_type = None

    self.url = 'file://' + os.getcwd() + '/../index.html'
    system = platform.system().lower()
    if system == "linux" or system == "linux2":
      self.chrome_path = '/usr/bin/google-chrome %s'
    elif system == "darwin":
      self.chrome_path = 'open -a /Applications/Google\ Chrome.app %s' # MacOS
    elif system == "win32":
      self.chrome_path = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe %s'

  def show(self):
    Plotter.isOpen = True
    webbrowser.get(self.chrome_path).open(self.url)
    self.server.run_forever()

  def plot(self,name,series):
    tipe = self.get_series_type(series)
    if not self.series_type: self.series_type = tipe
    else: assert self.series_type == tipe

    if tipe != "dates": series = MySeries(series)
    self.plots[name] = series
    self.server.send_message_to_all(json.dumps(self.msg_plots([name])))

  def set_start(self,start):
    self.start = start
    self.server.send_message_to_all(json.dumps(self.msg_start()))

  def set_end(self,end):
    self.end = end
    self.server.send_message_to_all(json.dumps(self.msg_end()))

  def set_formulas(self,formulas):
    self.formulas = formulas
    self.server.send_message_to_all(json.dumps(self.msg_formulas()))

  def new_client(self,client,server):
    msgs = [self.msg_plots(self.plots.keys())]

    if self.start==None and len(self.plots.keys())>0:
      if self.series_type=="floats": self.start = 0
      if self.series_type=="dates": self.start = str(min([x.index[0] for x in self.plots.values()]))
     
    if self.end==None and len(self.plots.keys())>0:
      if self.series_type=="floats": self.end = max([len(x) for x in self.plots.values()])
      if self.series_type=="dates": self.end = str(max([x.index[-1] for x in self.plots.values()]))

    if self.start is not None: msgs.append(self.msg_start())
    if self.end is not None: msgs.append(self.msg_end())

    if self.formulas is None: self.formulas = self.plots.keys()
    msgs.append(self.msg_formulas())

    if self.chart_type is not None: msgs.append(self.msg_chart_type())
    if self.chart_options is not None: msgs.append(self.msg_chart_options())

    msg = json.dumps(self.msg_join(msgs))
    self.server.send_message(client,msg)
    # it's weird that I can call shutdown here and still keep sending messages later
    self.server.shutdown()

  def close(self):
    # why isn't server_close enough? doesn't seem to close the javascript side
    for client in self.server.clients:
      self.server.send_message(client,json.dumps({"type": "close"}))
    self.server.server_close()
    Plotter.isOpen = False

  def formula(self,text,off=None,hidden=None,rhs=None,color=None,title=None):
    formula = {"text": text}
    if off!=None: formula["off"] = off
    if hidden!=None: formula["hidden"] = hidden
    if rhs!=None: formula["rhs"] = rhs
    if color!=None: formula["color"] = color
    if title!=None: formula["title"] = title
    return formula

  def set_chart_type(self,chart_type):
    self.chart_type = chart_type

  def set_chart_options(self,chart_options):
    self.chart_options = chart_options

  def trendlines(self,series_nums):
    ans = {}
    for num in series_nums:
      ans[str(num)] = {
        "lineWidth": 1,
        "opacity": 0.7,
        "pointSize": 0,
        "showR2": True,
        "type": "linear",
        "visibleInLegend": True
      }
    return {"trendlines": ans}

  def get_series_type(self,series):
    if isinstance(series,pandas.Series):
      assert isinstance(series.index[0],datetime.date), "series index is not dates. This is not supported"
      return "dates"

    if isinstance(series,collections.Iterable):
      assert isinstance(series[0],float) or isinstance(series[0],int)
      return "floats"

    raise Exception("invalid series type")

  def series_formatted(self,name):
    data = []
    for idx,val in self.plots[name].iteritems():
      data.append([str(idx),val]);
    return data

  def msg_plots(self,names):
    msg = {'type': "plots", 'data': []}
    for name in names:
      msg['data'].append({'name': name, 'series': self.series_formatted(name)})
    return msg

  def msg_start(self):
    return {'type': "start", 'data': self.start}

  def msg_end(self):
    return {'type': "end", 'data': self.end}

  def msg_formulas(self):
    formulas = []
    for formula in self.formulas: 
      if type(formula)==str: formulas.append({"text": formula})
      else: formulas.append(formula)

    return {'type': "parsed_formulas", 'data': formulas}

  def msg_chart_type(self):
    return {'type': "chart_type", 'data': self.chart_type}

  def msg_chart_options(self):
    return {'type': "chart_options", 'data': self.chart_options}

  def msg_join(self,msgs):
    return {'type': "multiple", 'data': msgs}

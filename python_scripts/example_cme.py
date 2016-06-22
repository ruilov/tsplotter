import pricer.cme as cme,time
from pricer.markets import *
from pricer.option import Option
from tsplotter.tsplotter import Plotter
from lib.myseries import MySeries
from datetime import date

cme.init()

plotter = Plotter()
plotter.show()
plotter.set_start("2014-01-01")
plotter.set_end("2018-01-01")

for rate in [LIBOR,FF]:
  plotter.plot(rate.name,rate.rates())
  plotter.set_formulas([rate.name])
  time.sleep(0)

for cmd in [WTI,RB,NG]:
  plotter.plot(cmd.name, cmd.futures())
  plotter.plot(cmd.name+"_ATM", cmd.vols().map(lambda x: x(0.5)))
  plotter.plot(cmd.name+"_PUT", cmd.vols().map(lambda x: x(0.25)))
  plotter.plot(cmd.name+"_CALL", cmd.vols().map(lambda x: x(0.75)))
  plotter.set_formulas([cmd.name])
  time.sleep(0)

formulas = [
  {"text": "WTI_PUT", "color": "#FF5555"},
  {"text": "WTI_ATM", "color": "#0000FF"},
  {"text": "WTI_CALL", "color": "#FF5555"},
  {"text": "vol(CHRIS|CME_CL3,40)", "title": "hist", "color": "#0000AA"},
  # "FRED|USD3MTD156N;libor",
  # "LIBOR*100;libor",
  {"text": "0", "color": "#000000"}
]
plotter.set_formulas(formulas)
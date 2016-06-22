from tsplotter.tsplotter import Plotter
import pricer.cme as cme, time
from pricer.markets import *

p = Plotter()
p.set_start("2014-01-01")
p.set_end("2018-01-01")

cme.init()

p.plot(WTI.name, WTI.futures())
p.plot(NG.name, NG.futures())

p.set_formulas([
  "CHRIS|CME_CL1", 
  "WTI",
  {"text": "CHRIS|CME_NG1", "hidden": True},
  {"text": "NG", "color": "#00AAAA", "title": "nat gas", "rhs": True}
])

p.show()
from tsplotter.tsplotter import Plotter
from cycling.parser import tcx
import numpy as np
from lib.myseries import MySeries

plotter = Plotter()
plotter.set_start(0)

routes = ["cycling/nyack jun8.tcx","cycling/piemont40 10jun16.tcx"]

total_dist = 0
series = {}
for i,r in enumerate(routes):

  [route,alt] = tcx(r)
  total_dist = max(route.index[-1],total_dist)
  series["time" + str(i)] = route
  series["alt" + str(i)] = alt

dists = np.linspace(0,total_dist,500)
plotter.set_end(len(dists))
plotter.plot("dist",dists)

for name in series.keys():
  series[name] = series[name].interp(dists)
  plotter.plot(name,series[name])

plotter.set_formulas(series.keys())
plotter.show()

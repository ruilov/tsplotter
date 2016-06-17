from tsplotter.tsplotter import Plotter
from cycling.parser import tcx
import numpy as np
from lib.myseries import MySeries

plotter = Plotter()
plotter.set_chart_type("ScatterChart")
# [ts,alts] = tcx("cycling/nyack jun8.tcx")
# [ts,alts] = tcx("cycling/piemont40 10jun16.tcx")
[ts,alts] = tcx("cycling/hills 14jun16.tcx")

dists = np.linspace(0,ts.index[-1],1500)
ts = ts.interp(dists)
alts = alts.interp(dists)

plotter.plot("dist", dists)
plotter.plot("ts", ts)
plotter.plot("alts", alts)
plotter.set_formulas([
  plotter.formula("n=3",hidden=True),
  plotter.formula("grade = d(alts)/d(dist)/1.609/10",hidden=True),
  plotter.formula("speed = d(dist)/d(ts)",hidden=True,color="rgb(51, 102, 204)"),
  plotter.formula("zapper = speed*0",hidden=True),
  plotter.formula("m=2",off=True), # just to show off
  plotter.formula("subsample(avg(zap(zapper,grade),n),n)",color="#FF0000"),
  plotter.formula("subsample(avg(zap(zapper,speed),n),n)",title="speed")
])

plotter.set_chart_options(plotter.trendlines([0]));
plotter.show()

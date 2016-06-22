from tsplotter.tsplotter import Plotter
import pricer.cme as cme,time
from pricer.markets import *

cme.init()

plotter = Plotter()
plotter.show()
plotter.set_start("2016-01-01")
plotter.set_end("2018-01-01")
plotter.plot("LIBOR",LIBOR.rates())
plotter.set_formulas(["LIBOR*1e4"])
plotter.close()

plotter2 = Plotter()
plotter2.set_start("2016-01-01")
plotter2.set_end("2018-01-01")
plotter2.plot("FF",FF.rates())
plotter2.set_formulas(["FF*1e4"])
plotter2.show()
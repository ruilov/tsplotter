import pricer.monte_carlo as mc,datetime
from pricer.markets import *

mc.save_paths()

# [sim_dates, paths] = mc.load_paths(WTI,datetime.date(2016,7,22))
# print(sim_dates)
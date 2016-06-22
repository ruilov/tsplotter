import pricer.cme
from pricer.vol_calibrator import *
from pricer.markets import *

pricer.cme.init()

mkt = WTI
calibrate_long_vol(mkt)
calibrate_long_short_corr(mkt)
calibrate_beta(mkt)
calibrate_local_vols(mkt)


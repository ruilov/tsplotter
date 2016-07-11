from lib.myseries import MySeries
from pricer.markets import *
import lib.dateutils,pricer.quant as quant
import numpy as np

def calibrate_rates_mkt(mktdata,mkt):
  pricing_date = mktdata.pricing_date
  futures = mkt.futures()

  strip = MySeries()
  strip[pricing_date] = quant.annual_to_continuous(quant.futures_to_annual(futures[0]))

  for month,val in futures.itermonths():
    sd = mkt.start_date(month)
    ld = mkt.end_date(month)
    if sd < pricing_date: continue
    sd_ld_rate = quant.annual_to_continuous(quant.futures_to_annual(val))
    strip[ld] = (strip.interp(sd) * dateutils.dt(pricing_date,sd) + 
      sd_ld_rate * dateutils.dt(sd,ld) ) / dateutils.dt(pricing_date,ld)
    
  for dt,val in strip.iteritems():
    mktdata.addCoord(RatesCoord(mkt,dt),val)

def extend_fedfunds(mktdata):
  pricing_date = mktdata.pricing_date
  libor = LIBOR.rates()
  ff_mkt = FF
  ff = ff_mkt.rates()

  # extend ff up to where libor is calibrated, via linear interpolation of the FFL spread
  ffl = MySeries()
  for dt,ff_rate in ff.iteritems():
    deltaT = dateutils.dt(pricing_date,dt)
    if deltaT<0.5: continue
    ffl[deltaT] = libor.interp(dt) - ff_rate

  ffl_poly = np.poly1d(np.polyfit(ffl.index,ffl.values,1))
  for dt,libor_rate in libor.iteritems():
    if dt <= ff.index[-1]: continue
    mktdata.addCoord(RatesCoord(ff_mkt,dt),libor_rate-ffl_poly(dateutils.dt(pricing_date,dt)))

def calibrate_rates(mktdata):
  calibrate_rates_mkt(mktdata,LIBOR)
  calibrate_rates_mkt(mktdata,FF)
  extend_fedfunds(mktdata)

# mktdata = cme_data()
# calibrate_rates(mktdata)
# libor = mktdata.market_by_name("libor").rates()
# ff = mktdata.market_by_name("fedfunds").rates()
# for dt,libor_rate in libor.iteritems():
#   print dt,"|",libor_rate*1e4,"|",ff.interp(dt)*1e4
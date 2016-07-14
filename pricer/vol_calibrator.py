import pricer.quant as quant,numpy as np,math,lib.dateutils as du,pricer.gabillon
from heapq import nsmallest
from pricer.markets import *
from lib.myseries import MySeries
from tsplotter.tsplotter import Plotter

# this calibration is good enough to calibrate WTI
# however for NG because apr vol << mar vol, it fails due to negative fwd var
# for NG we'll need a future calibration

def calibrate_vols():
  calibrate_term_vols(WTI)
  calibrate_term_vols(NG)
  calibrate_term_vols(RB)

def calibrate_long_vol(mkt):
  last_vol = mkt.vols()[-1](0.5) * .8 # if the long vol is too high, we fail to calibrate
  mkt.mktdata.addCoord(LongVolCoord(mkt),last_vol)

def calibrate_long_short_corr(mkt):
  mkt.mktdata.addCoord(LongShortCorrCoord(mkt),0.95)

def calibrate_beta(mkt):
  mkt.mktdata.addCoord(BetaCoord(mkt),0.3)

def calibrate_local_vols(mkt):
  first_month = du.date_to_month(mkt.vols().index[0])
  last_month = du.date_to_month(mkt.vols().index[-1])

  local_vols = MySeries()
  term_vols = MySeries() # for debugging

  prev_var = 0.0
  prev_T = 0.0
  for month in du.month_generator(first_month,last_month):
    opt_exp = mkt.option_expiration(month)
    term_vol = mkt.vol(month,0.5)
    T = du.dt(mkt.mktdata.pricing_date,opt_exp)

    total_local_vol = gabillon.local_vol_from_term_vol(term_vol,T,mkt.long_vol(),mkt.beta(),mkt.long_short_corr())
    total_local_var = total_local_vol * total_local_vol * T

    inc_var = total_local_var - prev_var
    # print month,"|",T,"|",total_local_vol,"||",term_vol
    if inc_var < -1e-3: raise Exception("negative local var for " + month + ": " + str(inc_var))
    inc_T = T - prev_T

    local_vol = math.sqrt(inc_var/inc_T)
    local_vols[opt_exp] = local_vol
    term_vols[opt_exp] = term_vol

    # sanity check it
    # term_vol_check = gabillon.term_vol(local_vols,opt_exp,mkt.mktdata.pricing_date,mkt.long_vol(),mkt.beta(),mkt.long_short_corr())
    # assert abs(term_vol_check-term_vol)<1e-14
    # print month,"|",T,"|",total_local_vol,"|",local_vol,"|",term_vol_check

    prev_var = total_local_var
    prev_T = T
    
  plotter = Plotter()
  plotter.plot("local_" + str(mkt),local_vols)
  plotter.plot("term_" + str(mkt),term_vols)
  plotter.show()

def calibrate_term_vols(mkt):
  ff = FF.rates()
  calls = mkt.option_prices("call")
  puts = mkt.option_prices("put")
  futures = mkt.futures()

  idx = 0
  n_points_for_atm = 5
  smile_poly_degree = 4

  for month,S in futures.itermonths():
    opt_exp = mkt.option_expiration(month)
    T = du.dt(mkt.mktdata.pricing_date,opt_exp)
    r = ff.interp(opt_exp)
    df = math.exp(-r*T)

    # each elem in vols has a strike and an implied vol
    vols = []
    for [opts,callput] in [[calls,"call"],[puts,"put"]]:
      if month in opts:
        for K,P in opts[month].iteritems():
          intrinsic = quant.intrinsic(callput,S,K,df)
          if intrinsic > S*0.02: continue # too much IR dependency, and the CME seems to be bad at handling rates, better to look at otm options
          if abs(P-0.01) < 1e-10: continue # the CME seems to use 0.01 for options which have zero model value, ie very otm
          # if K / S > 3.0 or K / S < 0.33: continue # too otm 

          # print(month,P,callput,S,K,T,r,quant.blackScholes_price(callput,S,K,T,1e-20,r),quant.blackScholes_price(callput,S,K,T,6,r))
          vol = quant.implied_vol(P,callput,S,K,T,r)
          vols.append((K,vol))

    if len(vols)<n_points_for_atm: continue

    # calculate the atm vol
    vols.sort(key=lambda x: x[0])
    closest_to_atm = nsmallest(n_points_for_atm,vols,key = lambda x: abs(x[0]-S))
    atm_poly = np.poly1d(np.polyfit([x[0] for x in closest_to_atm],[x[1] for x in closest_to_atm],1))
    atm_vol = atm_poly(S)

    vols_by_QD = [(x[0],quant.quick_delta(S,x[0],T,atm_vol),x[1]) for x in vols] # convert to QD
    vols_by_QD = [x for x in vols_by_QD if x[1] > 0.05 and x[1] < 0.95] # filter out the very otm options  

    if len(vols_by_QD)<smile_poly_degree*2: continue

    QDs = [x[1] for x in vols_by_QD]
    if min(QDs) > .3 or max(QDs) < .7: continue

    vol_poly = np.poly1d(np.polyfit([x[1] for x in vols_by_QD],[x[2] for x in vols_by_QD],smile_poly_degree)) # fit a polynomial
    mkt.mktdata.addCoord(VolsCoord(mkt,month),vol_poly)

    # for (K,QD,vol) in vols_by_QD:
    #   print du.parse_month(month),"|",T,"|",S,"|",K,"|",vol,"|",QD,"|",idx
    #   idx += 1

    # for QD in range(1,20):
    #   QD2 = float(QD) / 20
    #   v = vol_poly(QD2)
    #   print du.parse_month(month),"|",T,"|",S,"|",QD2,"|",v,"|",idx
    #   idx += 1

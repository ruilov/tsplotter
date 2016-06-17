import lib.dateutils,quant,numpy as np,math
from heapq import nsmallest
from markets import *

def calibrate_vols(mktdata):
  calibrate_vol_market(mktdata,WTI)
  calibrate_vol_market(mktdata,NG)
  calibrate_vol_market(mktdata,RB)  

  # mkt = RB
  # for month in dateutils.month_generator(mkt.first_option(),"DEC21"):
  #   print dateutils.parse_month(month),"|",
  #   for QD in range(1,20):
  #     QD = float(QD) / 20
  #     print mkt.vol(month,QD),"|",
  #   print ""

def calibrate_vol_market(mktdata,mkt):
  ff = FF.rates()
  calls = mkt.option_prices("call")
  puts = mkt.option_prices("put")
  futures = mkt.futures()

  idx = 0
  n_points_for_atm = 5
  smile_poly_degree = 4

  for month,S in futures.itermonths():
    opt_exp = mkt.option_expiration(month)
    T = dateutils.dt(mktdata.pricing_date,opt_exp)
    r = ff.interp(opt_exp)
    df = math.exp(-r*T)

    # each elem in vols has a strike and an implied vol
    vols = []
    for [opts,callput] in [[calls,"call"],[puts,"put"]]:
      if month in opts:
        for K,P in opts[month].iteritems():
          intrinsic = quant.intrinsic(callput,S,K,df)
          if intrinsic > S*0.02: continue # too much IR dependency, and the CME seems to be bad at handling rates, better to look at otm options

          # print P,callput,S,K,T,r,quant.blackScholes_price(callput,S,K,T,1e-20,r),quant.blackScholes_price(callput,S,K,T,6,r)
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
    mktdata.addCoord(VolsCoord(mkt,month),vol_poly)

    # for (K,QD,vol) in vols_by_QD:
    #   print dateutils.parse_month(month),"|",T,"|",S,"|",K,"|",vol,"|",QD,"|",idx
    #   idx += 1

    # for QD in range(1,20):
    #   QD2 = float(QD) / 20
    #   v = vol_poly(QD2)
    #   print dateutils.parse_month(month),"|",T,"|",S,"|",QD2,"|",v,"|",idx
    #   idx += 1
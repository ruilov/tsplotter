import lib.dateutils as du,pricer.cme,math,numpy as np,pricer.quant as quant,random,bisect,cProfile,re
from pricer.markets import *
from pricer.option import Option
from lib.myseries import MySeries
from scipy.stats import norm

def total_var_old(log_strike,time,vol_poly,total_atm_vol):
  # qd = norm.cdf(log_strike/total_atm_vol)
  qd = 0.5
  wing_vol = vol_poly(qd)
  return wing_vol*wing_vol*time
  # return 0.4*0.4*time

def interp_polys(t,qd,prev_t,prev_poly,next_t,next_poly):
  if prev_t == next_t: return next_poly(qd)

  prev_vol = prev_poly(qd)
  next_vol = next_poly(qd)
  slope = (next_vol - prev_vol) / (next_t - prev_t)
  return prev_vol + (t - prev_t) * slope

def total_var(log_strike,time,vol_ts,vol_polys):
  idx = bisect.bisect_left(vol_ts,time)
  if idx == 0 or idx == len(vol_ts) or vol_ts[idx] == time:
    if idx == len(vol_ts): idx -= 1
    prev_idx = idx
  else: prev_idx = idx-1

  atm_vol = interp_polys(time,0.5,vol_ts[prev_idx],vol_polys[prev_idx],vol_ts[idx],vol_polys[idx])
  qd = norm.cdf(log_strike / (atm_vol * math.sqrt(time)))
  wing_vol = interp_polys(time,qd,vol_ts[prev_idx],vol_polys[prev_idx],vol_ts[idx],vol_polys[idx])
  return wing_vol * wing_vol * time

def main():
  pricer.cme.init()

  option = Option(WTI,"DEC16","put",30.0)

  eps = 1e-4
  today = WTI.mktdata.pricing_date
  lastT = du.dt(today,option.expiration_date())
  dt = lastT / 100
  num_strikes = 500

  times = list(np.arange(dt,lastT + dt - 1e-7,dt))
  local_vols = np.zeros((len(times),num_strikes))
  cum_probs = np.zeros((len(times),num_strikes)) # this is for sanity checking
  strikes = np.zeros((len(times),num_strikes)) # this is for sanity checking

  vol_series = WTI.vols()
  vol_ts = [du.dt(today,x) for x in vol_series.index]
  vol_polys = vol_series.values
  # vol_idxs = list(range(0,len(vol_ts)))

  for ti,time in enumerate(times):
    tav = math.sqrt(total_var(0.0,time,vol_ts,vol_polys))
    low_strike = math.exp(-4*tav - tav*tav/2)
    high_strike = math.exp(3*tav - tav*tav/2)
    delta_strike = (high_strike - low_strike) / (num_strikes-1)
    for si,strike in enumerate(np.arange(low_strike,high_strike+delta_strike-1e-7,delta_strike)):
      strikes[ti][si] = strike

      # the following math is described in http://www.math.ku.dk/~rolf/teaching/ctff03/Gatheral.1.pdf
      log_strike = math.log(strike)
      var_base = total_var(log_strike,time,vol_ts,vol_polys)
      var_high = total_var(log_strike+eps,time,vol_ts,vol_polys)
      var_low = total_var(log_strike-eps,time,vol_ts,vol_polys)
      
      dw_dy = (var_high - var_base)/eps
      dw_dy_low = (var_base - var_low)/eps
      dw_dy2 = (dw_dy - dw_dy_low)/eps
      
      var_high_t = total_var(log_strike,time+eps,vol_ts,vol_polys)
      dw_dt = (var_high_t - var_base)/eps
      
      z = log_strike / var_base
      local_var = dw_dt / (1.0 - z * dw_dy + 0.25 * (-0.25 - 1.0/var_base + z*z) * dw_dy * dw_dy + 0.5 * dw_dy2)
      local_vol = math.sqrt(local_var)
      local_vols[ti][si] = local_vol

      # this is for sanity checking
      strike_high = math.exp(log_strike+eps)
      dstrike = strike_high - strike
      v_base = math.sqrt(var_base/time)
      v_high = math.sqrt(var_high/time)
      p1 = quant.blackScholes_price("call",1.0,strike,time,v_base,0.0)
      p2 = quant.blackScholes_price("call",1.0,strike_high,time,v_high,0.0)
      dprice_dk = (p2-p1)/dstrike
      cum_probs[ti][si] = 1.0+dprice_dk

  # ======================================================================
  random.seed(4)

  num_paths = 30000
  strike_idxs = list(range(0,num_strikes))
  hist = [0] * num_strikes
  pays = []

  path_vals = [1.0] * num_paths
  for ti in range(0,len(times)):
    rands = [random.gauss(0,1) for x in range(0,num_paths/2)]
    rands = rands + [-x for x in rands]
    for path_num in range(0,num_paths):
      local_vol = np.interp(path_vals[path_num],strikes[ti],local_vols[ti]) * math.sqrt(dt)
      path_vals[path_num] *= math.exp(rands[path_num]*local_vol - local_vol * local_vol / 2.0)

  for path_num,path_val in enumerate(path_vals):  
    pays.append(max(option.strike - path_val*option.underlying_price(),0))
    si = int(math.ceil(np.interp(path_val,strikes[-1],strike_idxs)))
    hist[si] += 1

  cum_hist = [0] * len(hist)
  c = 0.0
  for i,h in enumerate(hist):
    c += h
    cum_hist[i] = c / num_paths

  for i,s in enumerate(strikes[-1]):
    print s,"|",cum_probs[-1][i],"|",cum_hist[i]

  print option.price(),"|",np.mean(pays)

# cProfile.run('main()',"stats")
# main()

import pstats
p = pstats.Stats("stats")
p.strip_dirs().sort_stats("cumtime").print_stats()
import lib.dateutils as du,pricer.cme,math,numpy as np,random,bisect,cProfile,time
from pricer.markets import *
from pricer.option import Option
from lib.myseries import MySeries
from scipy.stats import norm

def idx_qd(idx,log_strike,vols):
  return norm.cdf(log_strike / (vols["polys"][idx](0.5) * math.sqrt(vols["ts"][idx])))

def idx_var(idx,log_strike,time,vols):
  qd = idx_qd(idx,log_strike,vols)
  vol = vols["polys"][idx](qd)
  return vol * vol * time

# calculates the total variance from zero to time, at the given log_strike
def total_var(log_strike,time,vols):
  idx = bisect.bisect_left(vols["ts"],time)
  if idx == 0 or idx == len(vols["ts"]) or vols["ts"][idx] == time:
    if idx == len(vols["ts"]): idx -= 1
    prev_idx = idx
  else: prev_idx = idx-1

  next_var = idx_var(idx,log_strike,time,vols)
  if idx == prev_idx: return next_var

  prev_var = idx_var(prev_idx,log_strike,time,vols)
  slope = (next_var - prev_var) / (vols["ts"][idx] - vols["ts"][prev_idx])
  ans = prev_var + (time - vols["ts"][prev_idx]) * slope
  return ans

# the range of strikes to calculate local vols in. We could do this for every path value, but that would take forever
def log_strike_range(num_strikes,time,vols):
  tav = math.sqrt(total_var(0.0,time,vols))
  low_strike = -4*tav - tav*tav/2 # make low_strike wide because of high put skews
  high_strike = 3*tav - tav*tav/2
  delta_strike = (high_strike - low_strike) / (num_strikes-1)
  strikes = np.array(np.arange(low_strike,high_strike+delta_strike-1e-7,delta_strike))
  return strikes

# the following math is described in http://www.math.ku.dk/~rolf/teaching/ctff03/Gatheral.1.pdf
def local_vol_calc(log_strike,time,vols):
  eps = 1e-4
  var_base = total_var(log_strike,time,vols)
  var_high = total_var(log_strike+eps,time,vols)
  var_low = total_var(log_strike-eps,time,vols)
  
  dw_dy = (var_high - var_base)/eps
  dw_dy_low = (var_base - var_low)/eps
  dw_dy2 = (dw_dy - dw_dy_low)/eps
  
  var_high_t = total_var(log_strike,time+eps,vols)
  dw_dt = (var_high_t - var_base)/eps

  if dw_dt < 0: return 0.0  # negative forward variance!
  
  z = log_strike / var_base
  local_var = dw_dt / (1.0 - z * dw_dy + 0.25 * (-0.25 - 1.0/var_base + z*z) * dw_dy * dw_dy + 0.5 * dw_dy2)
  local_vol = math.sqrt(local_var)
  return local_vol

# these are the days we'll actually simulate. The argument sim_days are the days the user wants to observe
# note that 'days' refers to the number of days from today to that date
def make_little_sim_days(sim_days,max_days=1):
  little_sim_days = list(range(max_days,sim_days[-1]+max_days,max_days))
  for day in sim_days:
    idx = bisect.bisect_left(little_sim_days,day)
    if little_sim_days[idx] != day: little_sim_days.insert(idx,day)
  return little_sim_days

def calib_local_vols(mkt,sim_dates):
  vol_series = WTI.vols()
  vol_ts = [du.dt(mkt.mktdata.pricing_date,x) for x in vol_series.index]
  vol_polys = vol_series.values
  vols = {"ts": vol_ts, "polys": vol_polys}
  num_strikes = 10
  answer = []
  answer.append({"log_strikes": [0.0], "local_vols": [vol_polys[0](0.5)]})

  sim_days = [(x-mkt.mktdata.pricing_date).days for x in sim_dates]
  little_sim_days = make_little_sim_days(sim_days)
  last_sim_day = 0
  for sim_day in little_sim_days:
    print sim_day
    time = float(sim_day)/365
    dt = float(sim_day - last_sim_day) / 365
    last_sim_day = sim_day

    small_dt = dt/1
    for time2 in np.arange(time - dt + small_dt,time + small_dt - 1e-6,small_dt):   
      log_strikes = log_strike_range(num_strikes,time2,vols)
      local_vols = np.array([local_vol_calc(x,time2,vols) for x in log_strikes])
      record = sim_day in sim_days and abs(time-time2)<1e-6
      answer.append({"dt": small_dt, "log_strikes": log_strikes, "local_vols": local_vols, "record": record})
  return answer
  
def monte_carlo(local_vols_arr,num_paths):
  eps = 1e-4
  path_vals = [0.0] * num_paths # paths are in log space
  answer = []
  for ei,elem in enumerate(local_vols_arr):
    if ei == 0: continue
    [dt,log_strikes,local_vols,record] = [elem["dt"],local_vols_arr[ei-1]["log_strikes"],local_vols_arr[ei-1]["local_vols"],elem["record"]]
    rands = [random.gauss(0,1) for x in range(0,num_paths/2)]
    rands = rands + [-x for x in rands]

    for path_num in range(0,num_paths):
      local_vol = np.interp(path_vals[path_num],log_strikes,local_vols)
      local_vol_high = np.interp(path_vals[path_num]+eps,log_strikes,local_vols)
      local_vol_deriv = (local_vol_high-local_vol)/eps

      inc_f = rands[path_num]*local_vol * math.sqrt(dt) - local_vol * local_vol * dt / 2.0
      # the log-milstein time-discretization correction
      # see: http://papers.ssrn.com/sol3/papers.cfm?abstract_id=2175090
      inc_f += 0.5 * local_vol * local_vol_deriv * (rands[path_num]*rands[path_num]-1)*dt
      path_vals[path_num] += inc_f
    if record: answer.append([math.exp(x) for x in path_vals])
  return answer
    
def main():
  pricer.cme.init()
  num_paths = 10000

  opt = Option(WTI,"DEC16","put",30.0)
  local_vols_arr = calib_local_vols(WTI,[opt.expiration_date()])

  # for dt,val in WTI.vols().iteritems(): print du.dt(WTI.mktdata.pricing_date,dt),"|",val(0.5)
  
  t1 = time.time()
  for seed in range(1,20):
    random.seed(seed)
    paths = monte_carlo(local_vols_arr,num_paths)
    pays = [max(opt.strike - x * opt.underlying_price(),0) for x in paths[0]]
    t2 = time.time()
    runt = (t2-t1)
    t1 = t2
    print opt.price()/opt.discount_factor(),"|",np.mean(pays),"|",runt

main()

# cProfile.run('main()',"stats")
# import pstats
# p = pstats.Stats("stats")
# p.strip_dirs().sort_stats("cumtime").print_stats()
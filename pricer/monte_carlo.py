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

def insert_if_not_in(a,x):
  idx = bisect.bisect_left(a,x)
  if a[idx] != x: 
    a.insert(idx,x)

# these are the days we'll actually simulate. The argument sim_days are the days the user wants to observe
# note that 'days' refers to the number of days from today to that date
def make_little_sim_days(sim_days,vol_days,max_days=5):
  little_sim_days = list(range(max_days,sim_days[-1]+max_days,max_days))
  
  for day in sim_days:
    insert_if_not_in(little_sim_days,day)

  for day in vol_days:
    if day > sim_days[-1]: break
    insert_if_not_in(little_sim_days,day)

  return little_sim_days

def make_grid(today,sim_dates,num_strikes,vols):
  answer = []
  answer.append({"strikes": np.array([1.0]), "local_vols": np.array([vols["polys"][0](0.5)])})
  sim_days = [(x-today).days for x in sim_dates]
  little_sim_days = make_little_sim_days(sim_days,vols["days"])
  last_sim_day = 0
  for sim_day in little_sim_days:
    time = float(sim_day)/365
    dt = float(sim_day - last_sim_day) / 365
    last_sim_day = sim_day

    log_strikes = log_strike_range(num_strikes,time,vols)
    strikes = np.array(list(map(math.exp,log_strikes)))
    record = sim_day in sim_days 
    answer.append({"time": time, "dt": dt, "strikes": strikes, "record": record})
  return answer

def calib_local_vols(mkt,sim_dates):
  vol_series = WTI.vols()
  vol_ts = [du.dt(mkt.mktdata.pricing_date,x) for x in vol_series.index]
  vol_days = [(x - mkt.mktdata.pricing_date).days for x in vol_series.index]
  vol_polys = vol_series.values
  vols = {"ts": vol_ts, "polys": vol_polys, "days": vol_days}
  num_strikes = 10

  answer = make_grid(mkt.mktdata.pricing_date,sim_dates,num_strikes,vols)
  for ei,elem in enumerate(answer):
    if ei == 0: continue
    print("calibrating time=",elem["time"])
    elem["local_vols"] = np.array([local_vol_calc(math.log(x),elem["time"],vols) for x in elem["strikes"]])
  return answer
  
def monte_carlo_local_vols(local_vols_arr,num_paths):
  assert num_paths%2 == 0  # we use antithetic paths
  eps = 1e-4
  path_vals = [1.0] * num_paths # paths are in log space
  answer = []
  for ei,elem in enumerate(local_vols_arr):
    if ei == 0: continue
    [dt,strikes,local_vols,record] = [elem["dt"],local_vols_arr[ei-1]["strikes"],local_vols_arr[ei-1]["local_vols"],elem["record"]]
    rands = [random.gauss(0,1) for x in range(0,int(num_paths/2))]
    rands = rands + [-x for x in rands]
    for path_num in range(0,num_paths):
      local_vol = np.interp(path_vals[path_num],strikes,local_vols)
      path_vals[path_num] *= 1 + rands[path_num] * math.sqrt(dt) * local_vol
      # path_vals[path_num] *= math.exp(rands[path_num] * local_vol * math.sqrt(dt) - local_vol*local_vol*dt/2)
    if record: answer.append(np.array(list(path_vals)))
  return np.array(answer)
    
def month_carlo(mkt,num_paths,end_month,seed=1):
  random.seed(seed)
  today = mkt.mktdata.pricing_date
  months = list()
  end_months = [du.month_end_date(x) for x in du.month_generator(du.date_to_month(today),end_month)]
  opt_exps = [mkt.option_expiration(x) for x in du.month_generator(mkt.first_option(),end_month)]
  sim_dates = end_months + opt_exps
  sim_dates.sort()
  sim_dates = np.unique(sim_dates)
  if sim_dates[0]==today: sim_dates = sim_dates[1:]

  local_vols_arr = calib_local_vols(mkt,sim_dates)
  paths = monte_carlo_local_vols(local_vols_arr,num_paths)
  return [sim_dates,paths]
  
def test():
  pricer.cme.init()
  num_paths = 10000

  opt = Option(WTI,"DEC16","put",30.0)
  local_vols_arr = calib_local_vols(WTI,[opt.expiration_date()])

  t1 = time.time()
  for seed in range(1,20):
    random.seed(seed)
    paths = monte_carlo_local_vols(local_vols_arr,num_paths)
    pays = [max(opt.strike - x * opt.underlying_price(),0) for x in paths[0]]
    t2 = time.time()
    runt = (t2-t1)
    t1 = t2
    print(opt.price()/opt.discount_factor(),"|",np.mean(pays),"|",runt)  

def filename(mkt,date):
  return "cached/mc_" + str(mkt) + "_" + str(date).replace("-","")

def save_paths():
  pricer.cme.init()
  mkt = WTI
  num_paths = 10000
  [sim_dates,paths] = month_carlo(mkt,num_paths,"DEC26")
  fn = filename(mkt,mkt.mktdata.pricing_date)
  np.savez_compressed(fn,sim_dates,paths)

def load_paths(mkt,date):
  fn = filename(mkt,date)
  contents = np.load(fn + ".npz")
  [sim_dates,paths] = [contents["arr_0"],contents["arr_1"]]
  return {"dates": sim_dates, "values": paths}
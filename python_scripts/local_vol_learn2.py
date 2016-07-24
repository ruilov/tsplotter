import math,numpy as np,random
from scipy.stats import norm

def volf(logs,t):
  # return 0.4
  return .4 - .1*t + math.pow(logs,2)/40

def total_var(logs,t):
  vol = volf(logs,t)
  return vol * vol * t

def cp(strike,t):
  logs = math.log(strike)
  vol = volf(logs,t) * math.sqrt(t)
  d1 = (-logs + vol*vol/2)/vol
  d2 = d1 - vol
  p = norm.cdf(d1) - norm.cdf(d2)*strike
  return p

def pp(strike,t):
  return cp(strike,t) - (1.0 - strike)

num_paths = 10000
num_strikes = 10
eps = 1e-3
dt = 0.01
high_t = 1.0

for seed in range(1,100):
  random.seed(seed)
  path_vals = [0.0] * num_paths

  for t in np.arange(dt,high_t+1e-6,dt):
    # calc the strike range
    atmv = volf(0.0,t) * math.sqrt(t)
    slow = -5*atmv - atmv*atmv/2
    shigh = 4*atmv - atmv*atmv/2
    sd = (shigh - slow) / (num_strikes-1)
    log_strikes = np.array(np.arange(slow,shigh+sd-1e-7,sd))
    local_vols = []

    for logs in log_strikes:
      # strike = math.exp(logs)
      # c = cp(strike,t)
      # clow = cp(strike-eps,t)
      # chigh = cp(strike+eps,t)
      # dc_dk = (chigh - c)/eps
      # dc_dk_low = (c - clow)/eps
      # dc_dk2 = (dc_dk - dc_dk_low)/eps
      # c_t_high = cp(strike,t+eps)
      # dc_dt = (c_t_high-c)/eps
      # local_var = dc_dt / (0.5*strike*strike*dc_dk2)
      
      var_base = total_var(logs,t)
      var_high = total_var(logs+eps,t)
      var_low = total_var(logs-eps,t)
      dw_dy = (var_high - var_base)/eps
      dw_dy_low = (var_base - var_low)/eps
      dw_dy2 = (dw_dy - dw_dy_low)/eps
      var_high_t = total_var(logs,t+eps)
      dw_dt = (var_high_t - var_base)/eps  
      z = logs / var_base
      local_var = dw_dt / (1.0 - z * dw_dy + 0.25 * (-0.25 - 1.0/var_base + z*z) * dw_dy * dw_dy + 0.5 * dw_dy2)

      local_vols.append(math.sqrt(local_var))

    local_vols = np.array(local_vols)
    rands = [random.gauss(0,1) for x in range(0,num_paths/2)]
    rands = rands + [-x for x in rands]

    for path_num,path_val in enumerate(path_vals):
      local_vol = np.interp(path_val,log_strikes,local_vols) * math.sqrt(dt)
      path_vals[path_num] += rands[path_num] * local_vol - local_vol * local_vol / 2

  path_vals = map(math.exp,path_vals)
  strike = 0.8
  pays = [max(strike-x,0) for x in path_vals]
  print pp(strike,high_t),"|",np.mean(pays)
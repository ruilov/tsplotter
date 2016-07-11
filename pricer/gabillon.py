import math,lib.dateutils as du,numpy as np

# local_vol is a series, the others are numbers
# return value is not annualized
# def term_var(local_vol,T,long_vol,beta,corr):
#   dt = 0.000001
#   t = 0.0
#   term_var = 0.0
#   while t < T:
#     exp = math.exp(-beta*(T-t))
#     sig1 = local_vol * exp
#     sig2 = long_vol * (1.0 - exp)
#     term_var += (sig1*sig1 + sig2*sig2 + sig1*sig2*corr*2) * dt
#     t += dt
#   return term_var

# closed form of the integral above
def term_var_closed(local_vol,T,long_vol,beta,corr):
  var = 0.0
  eb = math.exp(-beta*T)
  var += local_vol*local_vol * (1.0-eb)*(1.0+eb)
  var += long_vol*long_vol * (T*beta*2 - (1.0-eb)*(3.0-eb))
  var += local_vol*long_vol*2*corr * (1.0-eb)*(1.0-eb)
  var /= beta*2
  return var

def term_vol_closed(local_vol,T,long_vol,beta,corr):
  return math.sqrt(term_var_closed(local_vol,T,long_vol,beta,corr)/T)

# term variance of future contract
def term_var(local_vol_series,date,today,long_vol,beta,corr):
  cum_local_var = 0
  prev = today
  for dt,local in local_vol_series.iteritems():
    end = min(dt,date)
    cum_local_var += local*local*du.dt(prev,end)
    if dt >= date: 
      T = du.dt(today,date)
      return term_var_closed(math.sqrt(cum_local_var/T),T,long_vol,beta,corr)
    prev = dt
  raise Exception("could not calculate term var as local vols don't go as far as " + str(date))
  
def term_vol(local_vol_series,date,today,long_vol,beta,corr):
  return math.sqrt(term_var(local_vol_series,date,today,long_vol,beta,corr)/du.dt(today,date))

# var is not annualized, but vols are
def local_vol_from_term_var(var,T,long_vol,beta,corr):
  eb = math.exp(-beta*T)
  c = long_vol*long_vol * (T*beta*2 - (1.0-eb)*(3.0-eb))
  c -= var * beta*2
  b = long_vol*2*corr * (1.0-eb)*(1.0-eb)
  a = (1.0-eb)*(1.0+eb)
  d = b*b - a*c*4
  ans = (math.sqrt(d) - b) / (a*2)
  return ans

def local_vol_from_term_vol(term_vol,T,long_vol,beta,corr):
  return local_vol_from_term_var(term_vol*term_vol*T,T,long_vol,beta,corr)

def sanity_checks():
  T = 2.98630137
  # sigma_s = 0.333296914
  sigma_l = 0.241735157192
  beta = 0.3
  corr = 0.95
  termv = 0.3

  sigma_s = local_vol_from_term_vol(termv,T,sigma_l,beta,corr)
  tv = term_vol(sigma_s,T,sigma_l,beta,corr)
  assert abs(tv-termv)<1e-14

  var = term_var_closed(sigma_s,T,sigma_l,beta,corr)
  print(math.sqrt(var))

  lv = local_vol_from_term_var(var,T,sigma_l,beta,corr)
  assert abs(lv-sigma_s)<1e-14

  np.random.seed(3)
  dt = 0.01
  sigma_s_dt = sigma_s * math.sqrt(dt)
  sigma_l_dt = sigma_l * math.sqrt(dt)
  chol = math.sqrt(1.0-corr*corr)

  ps = []
  for trial in range(0,1000):
    p = 0.0
    t = 0.0
    while t < T-1e-10:
      ex = math.exp(-beta * (T-t))

      r1 = np.random.randn()
      r2 = np.random.randn()
      r2 = corr * r1 + chol * r2

      ws = sigma_s_dt * ex * r1
      wl = sigma_l_dt * (1-ex) * r2
      p += ws+wl
      t += dt
    ps.append(p)

  print(np.average(ps))
  print(np.std(ps))

# sanity_checks()
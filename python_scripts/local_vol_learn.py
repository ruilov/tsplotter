import pricer.quant as quant,numpy as np,math,random

def vol_f(strike,t,spot):
  return 0.4 + math.pow(abs(spot-strike),2)/spot/200.0
  # return 0.4

def bs(spot,strike,time):
  return quant.blackScholes_price("call",spot,strike,time,vol_f(strike,time,spot),0.0)

spot = 50.0
lastT = 1.0
dk = 0.5
deltat = 0.05
eps = 1e-2

strikes = list(np.arange(30.0,spot*3,dk))
times = list(np.arange(deltat,lastT + deltat,deltat))

vols = np.zeros((len(times),len(strikes)))
calls = np.zeros((len(times),len(strikes)))
dc_dk = np.zeros((len(times),len(strikes)))
dc_dk2 = np.zeros((len(times),len(strikes)))
dc_dt = np.zeros((len(times),len(strikes)))
local_vols = np.zeros((len(times),len(strikes)))

for si,strike in enumerate(strikes):
  for ti,time in enumerate(times):
    v1 = vol_f(strike,time,spot)
    c1 = bs(spot,strike,time)
    c2 = bs(spot,strike-eps,time)
    c3 = bs(spot,strike+eps,time)
    c4 = bs(spot,strike,time+eps)

    dk1 = (c3-c1)/eps
    dk2 = (c1-c2)/eps
    dkk = (dk1-dk2)/eps
    dct = (c4-c1)/eps

    vols[ti][si] = v1
    calls[ti][si] = c1
    dc_dk[ti][si] = 1.0+dk1
    dc_dk2[ti][si] = dkk
    dc_dt[ti][si] = dct

    local_vol = dct / (0.5 * strike * strike * dkk)
    local_vols[ti][si] = math.sqrt(local_vol)

random.seed(2)

strike_is = list(range(0,len(strikes)))
num_paths = 10000
hist = [0] * len(strikes)
for path_num in range(0,num_paths):
  s = spot
  for ti in range(1,len(times)):
    dt = times[ti] - times[ti-1]
    local_vol = np.interp(s,strikes,local_vols[ti])
    local_vol *= math.sqrt(dt)
    s *= math.exp(random.gauss(0,1)*local_vol - local_vol * local_vol / 2.0)
  
  si = int(math.floor(np.interp(s,strikes,strike_is)))
  si = min(max(si,0),len(strikes)-1)
  hist[si] += 1
  # print s,"|",si

cum_hist = [0] * len(strikes)
c = 0.0
for i,h in enumerate(hist):
  c += h
  cum_hist[i] = c / num_paths

for i,s in enumerate(strikes):
  print s,"|",dc_dk[-1][i],"|",cum_hist[i]

# for i,s in enumerate(strikes):
#   print s,"|",vols[-1][i]
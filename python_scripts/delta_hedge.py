import numpy as np,random,math
import pricer.quant as quant

random.seed(1)

trials = 40
vol = 0.4
strike = 70.0
time_steps = 365
price = 50.0

opt_price = quant.blackScholes_price("call",price,strike,1.0,vol,0.0)
print "price =",opt_price

dt = 1.0/time_steps
little_v = vol * math.sqrt(dt)

ps = []
for trial in range(0,trials):
  p = price
  delta = 1.0-quant.blackScholes_delta("call",p,strike,1.0,vol,0.0)
  cum_cf = delta * p  
  for t in np.arange(dt,1.0+1e-10,dt):
    p *= math.exp(random.normalvariate(0.0,little_v) - little_v*little_v/2)
    if t == 1.0: new_delta = 1.0 if p > strike else 0.0
    else: new_delta = 1.0-quant.blackScholes_delta("call",p,strike,1.0-t,vol,0.0)
    cum_cf += (new_delta-delta)*p
    delta = new_delta
    # print t,"|",p,"|",delta,"|",cum_cf
    
  if delta == 1.0: cum_cf -= strike
  print trial,"|",cum_cf
  ps.append(cum_cf)

print "avg =",np.mean(ps)
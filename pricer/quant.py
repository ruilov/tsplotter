import math
from scipy.optimize import brentq
from scipy.stats import norm

def blackScholes_price(callput,S,K,T,v,r):
  d1 = (math.log(float(S)/K)+(r+v*v/2.)*T)/(v*math.sqrt(T))
  d2 = d1-v*math.sqrt(T)
  df = math.exp(-r*T)
  if callput=="call":
    ret = (S*norm.cdf(d1)-K*norm.cdf(d2))*df
  else:
    ret = (K*norm.cdf(-d2)-S*norm.cdf(-d1))*df
  return ret

def blackScholes_delta(callput,S,K,T,v,r):
  d1 = (math.log(float(S)/K)+(r+v*v/2.)*T)/(v*math.sqrt(T))
  df = math.exp(-r*T)
  if callput=='call':
    return 1.0-norm.cdf(d1)*df
  else:
    return norm.cdf(-d1)*df 

def quick_delta(S,K,T,v):
  return 1.0 - norm.cdf(math.log(float(S)/K)/(v*math.sqrt(T)))

def implied_vol(price,callput,S,K,T,r):
  return brentq(lambda v,cp,S1,K1,T1,r1: blackScholes_price(cp,S1,K1,T1,v,r1) - price,1e-20,6,args=(callput,S,K,T,r))

def intrinsic(callput,S,K,df):
  if callput == "call": return max(S-K,0)*df
  else: return max(K-S,0)*df

def extrinsic(callput,S,K,P):
  return P - intrinsic(callput,S,K)

def futures_to_annual(r):
  return 1.0 - r/100

# (1+r)^t = e^(tc) => 1+r = e^c => c = ln(1+r) => r = e^c - 1
def annual_to_continuous(r):
  return math.log(r+1)

def continuous_to_annual(c):
  return math.exp(c)-1

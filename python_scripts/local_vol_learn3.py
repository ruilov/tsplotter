import numpy as np,math
from scipy.stats import norm
import scipy.signal

def vol1(log_strike): return .6 - (log_strike+3)/30
def vol2(log_strike): return .4 + (log_strike+3)/30

def call_price(log_strike,vol_f):
  vol = vol_f(log_strike)
  d1 = (-log_strike + vol*vol/2) / vol
  d2 = d1 - vol
  cp = norm.cdf(d1) - norm.cdf(d2) * math.exp(log_strike)
  return cp

def dcall_dstrike(log_strike,vol_f):
  eps = 1e-3
  p1 = call_price(log_strike,vol_f)
  p2 = call_price(log_strike+eps,vol_f)
  delta = (p2-p1) / (math.exp(log_strike+eps)-math.exp(log_strike))
  return delta

min_log = -1.0
max_log = -min_log
log_delta = 1.0

prev_cdf1 = 0.0
prev_cdf2 = 0.0

ee1 = 0.0
ee2 = 0.0

pdfs1 = []
pdfs2 = []

log_strikes = np.arange(min_log,max_log + log_delta,log_delta)

for log_strike in log_strikes:
  cdf1 = 1.0+dcall_dstrike(log_strike,vol1)
  pdf1 = cdf1 - prev_cdf1
  if pdf1 < 0: raise Exception("negative pdf")
  pdfs1.append(pdf1)
  prev_cdf1 = cdf1
  ee1 += pdf1 * math.exp(log_strike)

  cdf2 = 1.0+dcall_dstrike(log_strike,vol2)
  pdf2 = cdf2 - prev_cdf2
  if pdf2 < 0: raise Exception("negative pdf at " + str(log_strike))
  pdfs2.append(pdf2)
  prev_cdf2 = cdf2
  ee2 += pdf2 * math.exp(log_strike)

  # print log_strike,"|",pdf1,"|",pdf2

# zeros = [0.0] * len(pdfs1)
# log_strikes = zeros + list(log_strikes) + zeros
# pdfs1 = [1e-10] * (len(pdfs1)/2*0) + list(pdfs1)
# pdfs2 = list(pdfs2) + [0.0] * (len(pdfs1)/2*2)

# print ee1,"|",ee2

# fft1 = np.fft.fft(np.array(pdfs1))
# fft2 = np.fft.fft(np.array(pdfs2))
# ratio = fft2/fft1
# sol = [x.real for x in np.fft.ifft(ratio)]
# conv = np.convolve(pdfs1,sol)

# pdfs1 = [0.5,0,0.5]
quotient,reminder = scipy.signal.deconvolve(pdfs2,pdfs1)

# print "\n".join(map(str,quotient))

conv2 = scipy.signal.convolve(pdfs1,quotient)
# print "\n".join(map(str,conv2))
# conv2 = np.convolve(pdfs1,sol2[1])
# conv2 = conv2[39:]

for idx,log_strike in enumerate(log_strikes):
  print log_strike,"|",pdfs1[idx],"|",pdfs2[idx] #,"|",quotient[idx],"|",conv2[idx]
  # print log_strike,"|",pdfs1[idx],"|",fft1[idx],"|",pdfs2[idx],"|",fft2[idx],"|",ratio[idx],"|",sol2[1][idx],"|",conv2[idx]

# for elem in conv2: print elem
# print sol2[0][0]
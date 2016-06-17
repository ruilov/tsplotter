import math

def info(n):
  s = 0
  for i in range(1,n/2+1):
    s += math.log(float(i+n/2)/i,2)
  return s

print info(4)
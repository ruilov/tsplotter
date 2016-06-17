import cme
from markets import *
from option import Option

cme.init()

for dt,val in RB.futures().iteritems():
  print dt,"|",val
print ""

for month in dateutils.month_generator("JAN18","Dec20"):
  put = Option(WTI,month,"put").set_atm()
  atm = put.price()
  put.strike -= 10
  atm10 = put.price()
  print put.start_date(),"|",put.underlying_price(),"|",atm,"|",atm10
print ""

print LIBOR.rates()
print ""

print WTI.mktdata.pricing_date
print ""
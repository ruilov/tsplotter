import pricer.cme,os
import lib.dateutils as dateutils
from pricer.markets import *
from pricer.option import Option

pricer.cme.init()

for month in dateutils.month_generator("JAN17","Dec20"):
  put = Option(WTI,month,"put")
  put.strike = 30.0
  p30 = put.price()
  put.strike = 26.0
  p25 = put.price()
  print(put.start_date(),"|",put.time_to_expiration(),"|",put.underlying_price(),"|",put.vol(),"|",put.interest_rate(),"|",p25,"|",p30)
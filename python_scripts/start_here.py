import pricer.cme,os
import lib.dateutils as dateutils
from pricer.markets import *
from pricer.option import Option

pricer.cme.init()

for month in dateutils.month_generator("AUG16","Dec19"):
  put = Option(WTI,month,"put").set_atm()
  vol = put.vol()
  put.strike = 40.0
  p40 = put.price()
  put.strike = 35.0
  p35 = put.price()
  put.strike = 30.0
  p30 = put.price()
  print put.start_date(),"|",vol,"|",put.underlying_price(),"|",p40,"|",p35,"|",p30
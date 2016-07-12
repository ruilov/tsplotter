import pricer.quant as quant
import lib.dateutils as dateutils
from pricer.markets import FF

class Option:
  def __init__(self,market,month,callput,strike=None):
    self.market = market
    self.month = month
    self.callput = callput.lower()
    self.strike = strike
    self.ir_curve = FF

  def start_date(self):
    return self.market.start_date(self.month)

  def end_date(self):
    return self.market.end_date(self.month)

  def atm_vol(self):
    return self.market.vol(self.month,0.5)

  def underlying_price(self):
    return self.market.price(self.month)

  def set_atm(self):
    self.strike = self.underlying_price()
    return self

  def expiration_date(self):
    return self.market.option_expiration(self.month)

  def time_to_expiration(self):
    return dateutils.dt(self.market.mktdata.pricing_date,self.expiration_date())

  def quick_delta(self):
    return quant.quick_delta(self.underlying_price(),self.strike,self.time_to_expiration(),self.atm_vol())

  def vol(self):
    return self.market.vol(self.month,self.quick_delta())

  def interest_rate(self):
    return self.ir_curve.rate(self.expiration_date())

  def price(self):
    return quant.blackScholes_price(self.callput,self.underlying_price(),self.strike,self.time_to_expiration(),
      self.vol(),self.interest_rate())

  def delta(self):
    delta = quant.blackScholes_delta(self.callput,self.underlying_price(),self.strike,self.time_to_expiration(),self.vol(),self.interest_rate())
    if self.callput == "call": return 1.0 - delta
    else: return -delta
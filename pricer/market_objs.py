import lib.dateutils as dateutils,datetime

class Market:

  def __init__(self,name,family,description=None,cme_future_code=None,cme_option_code=None,cme_strike_multiplier=1):
    self.name = name
    self.family = family
    self.description = description
    self.cme_future_code = cme_future_code
    self.cme_option_code = cme_option_code
    self.cme_strike_multiplier = cme_strike_multiplier
    self.mktdata = None

  def futures_expiration(self,month):
    raise Exception("not defined")
  
  def option_expiration(self,month):
    raise Exception("not defined")
  
  # some markets overwrite these two methods
  def start_date(self,month):
    return dateutils.month_start_date(month)    
  def end_date(self,month):
    return dateutils.month_end_date(month)

  def generic_nearby(self, expiration_func, dt=None):
    if not dt: dt = self.mktdata.pricing_date
    month = "JAN16"
    while expiration_func(month) < dt:
      month = dateutils.date_to_month(dateutils.add_months(dateutils.parse_month(month),1))
    return month

  def first_nearby(self, dt=None):
    return self.generic_nearby(self.futures_expiration,dt)
    
  def first_option(self, dt=None):
    return self.generic_nearby(self.option_expiration,dt)
  
  def futures(self):
    return self.mktdata.coords["futures"][self]

  def vols(self):
    return self.mktdata.coords["vols"][self]

  def rates(self):
    return self.mktdata.coords["rates"][self]

  def option_prices(self,option_type):
    return self.mktdata.coords["option price"][self][option_type]

  def price(self,month):
    strip = self.futures()
    if month in strip: return strip[month]
    raise Exception(str(month) + " not in futures strip of " + self.name)

  def vol(self,month,QD):
    month_dt = dateutils.parse_month(month)
    vols = self.vols()
    dt_prev = min(vols.index,key = lambda x: (month_dt - x).days if x<=month_dt else 1e8+(x-month_dt).days)
    dt_next = min(vols.index,key = lambda x: (x - month_dt).days if x>=month_dt else 1e8+(month_dt-x).days)    
    vol_prev = vols[dt_prev](QD)
    if dt_prev == dt_next: return vol_prev
    vol_next = vols[dt_next](QD)
    return (vol_prev * dateutils.dt(month_dt,dt_next) + vol_next * dateutils.dt(dt_prev,month_dt)) / dateutils.dt(dt_prev,dt_next)

  def rate(self,date):
    return self.rates().interp(date)

  def __str__(self): return self.name

class Coord:
  def __init__(self,market,type):
    self.market = market
    self.type = type

class FuturesCoord(Coord):
  def __init__(self,market,month):
    Coord.__init__(self,market,"futures")
    self.month = month

  def reference_date(self): return dateutils.parse_month(self.month)

  def __str__(self): return self.type + " coord: " + str(self.market) + "-" + self.month

class OptionPriceCoord(Coord):
  def __init__(self,market,month,option_type,strike):
    Coord.__init__(self,market,"option price")
    self.month = month
    self.option_type = option_type.lower()
    self.strike = strike

  def reference_date(self): return dateutils.parse_month(self.month)

  def __str__(self): return self.type + " coord: " + "-".join([str(self.market), self.month, self.option_type, str(self.strike)])

class VolsCoord(Coord):
  def __init__(self,market,month):
    Coord.__init__(self,market,"vols")
    self.month = month

  def reference_date(self): return dateutils.parse_month(self.month)

  def __str__(self): return self.type + " coord: " + str(self.market) + "-" + self.month

class RatesCoord(Coord):
  def __init__(self,market,date):
    Coord.__init__(self,market,"rates")
    self.date = date

  def reference_date(self): return self.date

  def __str__(self): return self.type + " coord: " + str(self.market) + "-" + str(self.date)

def wti_futures_expiration(month):
  dt = dateutils.parse_month(month)
  m = dt.month - 1
  y = dt.year
  if m==0:
    m = 12
    y -= 1

  return dateutils.minusb(datetime.date(y,m,25),3,"cme")

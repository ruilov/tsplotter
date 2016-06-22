from lib.mydict import MyDict
from lib.myseries import MySeries
import markets

class MktData:
  # fututres: type -> market -> dt -> val
  # rates: type -> market -> dt -> val
  # option prices: type -> market -> option_type -> dt -> strike -> val

  def __init__(self,pricing_date):
    self.coords = MyDict()
    self.pricing_date = pricing_date

  def addCoord(self,coord,value):
    tipe = coord.type
    dt = coord.reference_date()

    if tipe == "futures" or tipe == "rates" or tipe == "vols":
      self.coords[tipe][get_or_series(coord.market)][dt] = value

    if tipe == "option price":
      self.coords[tipe][coord.market][get_or_series(coord.option_type)][dt][coord.strike] = value

  # the markets that we get when we load a mktdata instance will be different from the ones defined in markets.py
  # replace them all
  def pickle_load_fix_markets(self):
    for mkt in markets.MARKETS:
      mkt.mktdata = self

    mkt_by_name = {x.name: x for x in markets.MARKETS}
    for tipe,tipe_vals in self.coords.items():
      new_tipe_vals = MyDict()
      for mkt,mkt_vals in tipe_vals.items():
        new_tipe_vals[mkt_by_name[mkt.name]] = mkt_vals
      self.coords[tipe] = new_tipe_vals
    
  def resort(self):
    for tipe,tipe_markets in self.coords.items():
      for market,market_val in tipe_markets.items():
        if type=="futures" or type=="rates": 
          market_val.sort_index(inplace=True)

        if type=="option price":
          for option_type,option_val in market_val.items():
            option_val.sort_index(inplace=True)
            for dt,val in option_val.iteritems():
              val.sort_index(inplace=True)

  def __str__(self):
    return str(self.coords)

def new_series(): 
  return MySeries()

def get_or_series(v):
  return (v, new_series)

  # futures
  #   type = futures
  #   family = commod, rates
  #   market = wti, brt, ng, libor, fedfunds
  #   point = [month]
  #   value = price
  #   metadata = description, contract code

  # option prices
  #   type = option price
  #   family = commod, rates
  #   market = wti, brt, ng, libor, fedfunds
  #   point = [month,option type,strike]
  #   value = price
  #   metadata = description, contract code

  # vols
  #   type = vols
  #   family = commod
  #   market = wti, brt, ng
  #   point = [month,delta]
  #   value = vol
  #   metadata = description, contract code

  # rates
  #   type = rates
  #   family = rates
  #   market = libor, fedfunds
  #   point = [date]
  #   value = rate
  #   metadata = description, contract code
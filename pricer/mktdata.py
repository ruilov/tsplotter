from lib.mydict import MyDict
from lib.myseries import MySeries
import lib.dateutils as dateutils
import pricer.markets,datetime,numpy as np

class MktData:
  def __init__(self,pricing_date):
    self.coords = MyDict()
    self.pricing_date = pricing_date

  def addCoord(self,coord,value):
    tipe = coord.type
    dt = coord.reference_date()

    if tipe == "futures" or tipe == "rates" or tipe == "vols" or tipe == "long vol" or tipe == "long short corr" or tipe == "beta" or tipe == "local vol":
      self.coords[tipe][get_or_series(coord.market)][dt] = value

    if tipe == "option price":
      self.coords[tipe][coord.market][get_or_series(coord.option_type)][dt][coord.strike] = value # the strike dimension will be created as another MySeries under the hood

  def to_save(self):
    ans = str(self.pricing_date) + "\n"
    for tipe in self.coords:
      ans += tipe + "\n"
      for mkt,mkt_vals in self.coords[tipe].items():
        if tipe != "option price":
          for dt,val in mkt_vals.iteritems():
            val_str = str(val)
            if tipe == "vols": val_str = "|".join([str(x) for x in list(val.c)])
            ans += str(mkt) + "|" + str(dt) + "|" + val_str + "\n"
        else:
          for opt_type,type_vals in mkt_vals.items():
            for dt,dt_vals in type_vals.iteritems():
              for strike,val in dt_vals.iteritems():
                ans += str(mkt) + "|" + str(dt) + "|" + opt_type + "|" + str(strike) + "|" + str(val) + "\n"
      ans += "\n"
    return ans

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

def from_saved(s):
  mkt_by_name = {x.name: x for x in pricer.markets.MARKETS}
  lines = s.split("\n")
  pricing_date = dateutils.parse_date(lines[0])
  m = MktData(pricing_date)

  tipe = None
  for line_num in range(1,len(lines)):
    line = lines[line_num]

    if tipe == None: 
      tipe = line
      continue

    if line == "":
      tipe = None
      continue

    tokens = line.split("|")
    market = mkt_by_name[tokens[0]]
    dt = dateutils.parse_date(tokens[1])

    if tipe != "option price":
      if tipe != "vols": value = float(tokens[2])
      else: value = np.poly1d([float(x) for x in tokens[2:]])
      m.coords[tipe][get_or_series(market)][dt] = value
    else:
      option_type = tokens[2]
      strike = float(tokens[3])
      value = float(tokens[4])
      m.coords[tipe][market][get_or_series(option_type)][dt][strike] = value
  return m
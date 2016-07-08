from panda_utils import *
import itertools

def print_corrs(sector_returns):
  for sector1 in sectors:
    print sector1,"|",
    for sector2 in sectors:
      c = sector_returns[sector1].corr(sector_returns[sector2])
      print c,"|",
    print ""

def print_betas(sector_returns,to,remove):
  to_std = np.std(sector_returns[to])
  for sector in sectors:
    sector_std = np.std(sector_returns[sector])
    corr = sector_returns[sector].corr(sector_returns[to])
    beta = corr * sector_std / to_std
    if remove and sector!=to:
      sector_returns[sector] -= sector_returns[to]*beta
    print sector,"|",beta,"|",sector_std*math.sqrt(252),"|",corr

# TODO: remove the spy component

sectors = ["EP","power","services","midstream","refining","renewables","spy","cl12"]
portfolio = {
  'midstream': .2,
  'services': .2,
  'refining': .2,
  'renewables': .2,
  'power': .2
}
start_date = '2014-05-20'
end_date = '2016-05-20'

common_dates = pd.date_range(start_date,periods = 365*20,freq='D')

# Get all prices and keep only the common dates
prices = {}
for sector in sectors:
  tickers = get_tickers('sectors/' + sector + '.txt') 
  for ticker in tickers:
    # print ticker
    try: prices[ticker] = close_prices(ticker)[start_date:end_date]
    except: 
      print ticker,"missing"
      continue

    common_dates = common_dates.intersection(prices[ticker].index) 

prices = {k: v[common_dates] for k,v in prices.items()}
print "common dates =", len(common_dates)
print "first date = ",common_dates[0].date()

# calc the returns for each sector
sector_returns = {}
for sector in sectors:
  returns = {}
  tickers = get_tickers('sectors/' + sector + '.txt') 
  for ticker in tickers:
    returns[ticker] = np.log(prices[ticker].pct_change()+1).dropna()
  sector_returns[sector] = sum(returns.values())/len(tickers)

sectors.append('port')
sector_returns['port'] = sum([sector_returns[s]*w for s,w in portfolio.items()])

# calc betas to crude
print "crude betas"
print_betas(sector_returns,'cl12',False)
print ""

# print "gas betas"
# print_betas(sector_returns,'ng12',False)
# print ""

print "corrs"
print_corrs(sector_returns)
print ""

# remove the spy compomnent
print "spy betas"
print_betas(sector_returns,'spy',True)
print ""

print "adj crude betas"
print_betas(sector_returns,'cl12',False)
print ""

# print "adj gas betas"
# print_betas(sector_returns,'ng12',False)
# print ""

print "adj corrs"
print_corrs(sector_returns)
print ""
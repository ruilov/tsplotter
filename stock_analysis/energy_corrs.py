from panda_utils import *
from stats import *

sectors = ["EP","power","services","midstream","refining","renewables","spy","cl12","ng12"]
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
    except Exception as e: 
      print(ticker,"missing")
      print(e)
      continue

    common_dates = common_dates.intersection(prices[ticker].index) 
    # print(ticker,len(common_dates))

prices = {k: v[common_dates] for k,v in prices.items()}
print("common dates =", len(common_dates))
print("first date = ",common_dates[0].date())

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

adj_sector_returns = remove_component(sector_returns,"spy")
for rets in [sector_returns,adj_sector_returns]:
  print_stds(rets)
  print("")
  print_corrs(rets)
  print("")
  print_betas(rets)
  print("\n")
from panda_utils import *
from stats import *
import pandas as pd,calendar

sectors = ["services_large_cap","services_capital_equip","services_smid","services_offshore","tiger_customers"]
portfolio = {k: 0.2 for k in sectors}
sectors += ["cl12","ng12","spy"]

start_date = '2006-01-01'
end_date = '2016-05-20'
min_sd = datetime.date(2006,2,1)
common_dates = pd.date_range(start_date,periods = 365*20,freq='D')

# Get all prices and keep only the common dates
prices = {}
for sector in sectors:
  tickers = get_tickers('sectors/' + sector + '.txt')
  for ticker in tickers:
    try: 
      ps = close_prices(ticker)[start_date:end_date]
      sd = ps.index[0]
      sd = datetime.date(sd.year,sd.month,sd.day)
      if(sd>min_sd): 
        print("skipping ",ticker, "as it only starts in",sd)
        continue
      prices[ticker] = ps
    except Exception as e: 
      print(ticker,"missing")
      print(e)
      continue

    common_dates = common_dates.intersection(prices[ticker].index)     
     
prices = {k: v[common_dates] for k,v in prices.items()}
print("common dates =", len(common_dates))
print("first date = ",common_dates[0].date())

print("year|",end="")
for ticker in prices.keys():
  print(ticker,"|",end="")
print("")

# for year in range(2006,2016):
#   print(year,"|",end="")
#   sd = datetime.date(year,1,1)
#   ed = datetime.date(year,12,31)
#   for ticker,ps in prices.items():
#     ps2 = ps[sd:ed]
#     print(ps2.mean(),"|",end="")
#   print("")

for year in range(2014,2016):
  for month in range(1,13):
    print(str(year) + "-" + str(month),"|",end="")
    sd = datetime.date(year,month,1)
    (weekday,last) = calendar.monthrange(year,month)
    ed = datetime.date(year,month,last)   
    for ticker,ps in prices.items():
      ps2 = ps[sd:ed]
      print(ps2.mean(),"|",end="")
    print("")

# crude_returns = np.log(prices["CL12"].pct_change()+1).dropna()
# crude_std = np.std(crude_returns)

# # calc the returns for each sector
# sector_returns = {}
# for sector in sectors:
#   returns = {}
#   tickers = get_tickers('sectors/' + sector + '.txt') 
#   for ticker in tickers:
#     returns[ticker] = np.log(prices[ticker].pct_change()+1).dropna()

#     corr = crude_returns.corr(returns[ticker])
#     beta = corr * np.std(returns[ticker]) / crude_std
#     print(ticker,"|",corr,"|",beta)

#   sector_returns[sector] = sum(returns.values())/len(tickers)

# sectors.append('port')
# sector_returns['port'] = sum([sector_returns[s]*w for s,w in portfolio.items()])
# for sector in sectors:
#   corr = crude_returns.corr(sector_returns[sector])
#   beta = corr * np.std(sector_returns[sector]) / crude_std
#   print(sector,"|",corr,"|",beta)
from panda_utils import *

# starts here  
tickers = get_tickers('dow.txt')
start_date = '2011-01-01'
spy_prices = close_prices('SPY')[start_date:]

for ticker in tickers:
  try: prices = close_prices(ticker)[start_date:]
  except: continue
  returns = np.log(prices.pct_change()+1).dropna().values
  ret = np.mean(returns) * 252
  std = np.std(returns) * math.sqrt(252)
  bet = beta(prices,spy_prices)
  if bet: print ticker,"|",std,"|",ret,"|",bet,"|",ret
  
import datetime,math
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# USED TO BREAK OUT A BIG CSV WITH ALL STOCKS INTO INDIVIDUAL CSVS

filename = '/Users/ruilov/stock_data/WIKI_20160518.csv'
col_names = np.array(['ticker','unadj. open','unadj. high','unadj. low','unadj. close','unadj. volume','ex-dividend','split ratio',
    'open', 'high', 'low', 'close', 'volume'])

contents = pd.read_csv(filename,nrows=1e8,header=None,names=col_names,index_col=1,parse_dates=True,iterator=True)
print "Loaded"

tickers = np.unique(contents['ticker'].values)
num_tickers = len(tickers)
count = 0
for ticker in tickers:
  count += 1
  print count,"/",num_tickers,":",ticker
  close_prices = contents.loc[contents['ticker']==ticker]['close']
  out_file = '/Users/ruilov/stock_data/' + ticker + '.csv'
  close_prices.to_csv(out_file)

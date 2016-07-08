import datetime,math
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def print_series(ser):
  for dt,val in ser.iteritems():
    print dt.date(),"|",val

def close_prices(ticker):
  filename = '/Users/ruilov/stock_data/' + ticker + '.csv'
  col_names = np.array(['close'])
  contents = pd.read_csv(filename,header=None,names=col_names,parse_dates=True)
  return contents['close']

def get_tickers(filename):
  tickers = []
  file = open(filename,'r')
  contents = file.read()
  lines = contents.split('\r')

  ans = []
  for line in lines: ans += line.split('\n')
  ans = [x.split('|')[0] for x in ans]
  return ans

def beta(stock_prices,mkt_prices):
  common_dates = stock_prices.index.intersection(mkt_prices.index)
  thr = datetime.datetime(2013,1,1).date()
  if len(common_dates) < 100 or common_dates[0].date()>thr: return None
  # print_series(stock_prices[common_dates])
  stock_ret = np.log(stock_prices[common_dates].pct_change()+1).dropna()
  mkt_ret = np.log(mkt_prices[common_dates].pct_change()+1).dropna()
  mkt_std = np.std(mkt_ret)
  return stock_ret.cov(mkt_ret) / mkt_std / mkt_std
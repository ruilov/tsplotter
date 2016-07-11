from panda_utils import *
import quandl
import matplotlib.pyplot as plt

# CAN BE USED TO SAVE INCREMENTAL DATA SERIES

quandl.ApiConfig.api_key = "jv5gSKq_-UbB7qqotxH6"
quandl.ApiConfig.api_version = "2015-04-09"

tickers = ["ETP","MMP","SEP"]
tickers = ["NG24"]

for ticker in tickers:
  # mydata = quandl.Dataset('GOOG/NYSE_' + ticker).data()
  mydata = quandl.Dataset('CHRIS/CME_' + ticker).data()
  pandas = mydata.to_pandas()
  
  # close_series = pandas["Adj. Close"] # for WIKI
  # close_series = pandas['Close']  # for GOOD
  close_series = pandas['Settle'] # for CHRIS
  print ticker,close_series['2016-05-10':]

  out_file = ticker_filename(ticker)
  close_series.to_csv(out_file)
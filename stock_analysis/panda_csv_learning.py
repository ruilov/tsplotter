import datetime,math
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# JUST SOME RANDOM TESTS

filename = '/Users/ruilov/stock_data/WIKI_20160518.csv'
col_names = np.array(['ticker','unadj. open','unadj. high','unadj. low','unadj. close','unadj. volume','ex-dividend','split ratio',
    'open', 'high', 'low', 'close', 'volume'])

contents = pd.read_csv(filename,nrows=1e5,header=None,names=col_names,index_col=1,parse_dates=True,iterator=True)

apple = contents.loc[contents['ticker']=='AAPL']['close']

returns = []
last = None
for dt,val in apple['2015-01-01':].iteritems():
  if last==None:
    last = val
    continue

  ret = math.log(last / val)
  last = val
  returns.append(ret)

print "return = ",np.mean(np.array(returns) * 252)*100, "%"
print "vol = ",np.std(np.array(returns) * math.sqrt(252))*100,"%"
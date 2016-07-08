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
start_date = '2016-05-10'
end_date = '2016-05-20'

xom_prices = close_prices("XOM")[start_date:end_date]
spy_prices = close_prices("SPY")[start_date:end_date]
cl12_prices = close_prices("CL12")[start_date:end_date]

common_dates = xom_prices.index.intersection(spy_prices.index)
common_dates = common_dates.intersection(cl12_prices.index)

xom_prices = xom_prices[common_dates]
spy_prices = spy_prices[common_dates]
cl12_prices = cl12_prices[common_dates]

xom_returns = np.log(xom_prices.pct_change()+1).dropna();
spy_returns = np.log(spy_prices.pct_change()+1).dropna();
cl12_returns = np.log(cl12_prices.pct_change()+1).dropna();

xom_std = np.std(xom_returns)
spy_std = np.std(spy_returns)
corr = xom_returns.corr(spy_returns)
beta = corr * xom_std / spy_std

print xom_std,spy_std,corr,beta

xom_removed = xom_returns - spy_returns * beta
corr2 = xom_removed.corr(cl12_returns)
print corr2
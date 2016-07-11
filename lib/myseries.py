from pandas import Series
import numpy as np
import lib.mydict,lib.dateutils,datetime,collections

class MySeries(Series):
  def interp(self,x):
    if isinstance(x,collections.Iterable):
      return [self.interp(y) for y in x]
    elif type(x)==datetime.date:
      idx = self.index.values
      idx = [(x-idx[0]).days for x in idx]
      return np.interp((x-self.index[0]).days,idx,self.values)
    else:
      return np.interp(x,self.index.values,self.values)

  def map(self,func):
    return MySeries(type(self).__bases__[0].map(self,func))

  def __getitem__(self,item):
    return lib.mydict.generic_get(self,convert_month(item))

  def __contains__(self,item):
    return type(self).__bases__[0].__contains__(self,convert_month(item))

  def __setitem__(self,key,item):
    return type(self).__bases__[0].__setitem__(self,convert_month(key),item)

  def itermonths(self):
    for dt,val in self.iteritems():
      yield (lib.dateutils.date_to_month(dt),val)

def convert_month(key):
  if type(key)==str:
    dt = lib.dateutils.parse_month(key)
    if dt: return dt
  return key
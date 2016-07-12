from json import JSONDecoder,JSONEncoder
import datetime
import pricer.mktdata
# it's important to import * into this module's namespace so that we can instanciate classes by name below (search for 'globals')
from pricer.market_objs import *
from lib.myseries import *
from lib.mydict import *
import numpy as np

class MktDataDecoder(JSONDecoder):
  def __init__(self, *args, **kargs):
    JSONDecoder.__init__(self, object_hook=self.dict_to_object,*args, **kargs)
    
  def dict_to_object(self, d):
    if '__type__' not in d: return d
    tipe = d['__type__']
    
    if tipe == 'datetime.date': return datetime.date(**d['dict'])  
    
    # series need special handling because json.dumps won't let me create a dict with non-string keys
    if tipe == 'MySeries':
      ans = MySeries()
      for elem in d['dict']: ans[elem[0]] = elem[1]
      return ans

    d2 = {}
    for elem in d['dict']: d2[elem[0]] = elem[1]

    # for some reason I can't import MktData directly into this namespace
    if tipe == 'MktData': return pricer.mktdata.MktData(**d2)

    # this is for all the types that just work and don't need special handling
    return globals()[tipe](**d2)

class MktDataEncoder(JSONEncoder):
  def default(self, obj):
    print("encoding",obj,type(obj))
    if isinstance(obj,str): return obj
    if obj is None: return "null"
    if isinstance(obj,float) or isinstance(obj,int): return str(obj)

    if isinstance(obj, datetime.date):
      return {
        '__type__' : 'datetime.date',
        'dict': {'year' : obj.year,'month' : obj.month,'day' : obj.day}
      }
    if isinstance(obj,pricer.mktdata.MktData) or \
      isinstance(obj,Coord) or \
      isinstance(obj,Market):
      tipe = type(obj).__name__
      d = []
      for k,v in obj.__dict__.items():
        if isinstance(obj,Market) and k == 'mktdata': continue # remove the point back
        if isinstance(obj,Coord) and k == 'type': continue
        if callable(v): continue
        print("key =",k,"value=",v)
        d.append((self.default(k),self.default(v)))
      print("returning",d)
      return {'__type__': tipe,'dict': d}
    elif isinstance(obj,MyDict):
      tipe = type(obj).__name__
      d = []
      for k,v in obj.items():
        if isinstance(obj,Market) and k == 'mktdata': continue # remove the point back
        if isinstance(obj,Coord) and k == 'type': continue
        if callable(v): continue
        print("key =",k,"value=",v)
        d.append((self.default(k),self.default(v)))
      print("returning3",d)
      return {'__type__': tipe,'dict': d}

    elif isinstance(obj,MySeries):
      d = []
      for k,v in obj.iteritems():
        if isinstance(v,np.float): v = float(v)
        elif isinstance(v,np.integer): v = int(v)
        d.append((k,v))
      tipe = type(obj).__name__
      print("returning2",d)
      return {'__type__': tipe,'dict': d}
    else:
      return JSONEncoder.default(self, obj)
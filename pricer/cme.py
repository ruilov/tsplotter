import urllib2,datetime,os.path,dill,pickle
import lib.dateutils as dateutils
from datetime import date
from markets import *
from mktdata import MktData
from ir_calibrator import calibrate_rates
from vol_calibrator import calibrate_vols

# The only Public method
def init(date=None,refetch=False):
  today = datetime.date.today()

  if not date: 
    if can_retrieve_now(): date = today
    else: date = latest_saved_raw_date()

  mktdata = load_calibrated_data(date)
  if mktdata: return mktdata

  # we need to load each page and calibrate it
  if date != today: raise Exception("cme mkt data not found")

  mktdata = MktData(date)
  config = cme_config()
  for mkt in config['markets']: mkt.mktdata = mktdata

  for page in config['pages']:
    url = config['url'].format(page)
    contents = load_page(url,page,date,refetch)
    parse_file(contents,config,mktdata)
  mktdata.resort()
  calibrate(mktdata)
  save_calibrated_data(mktdata)
  return mktdata

def cme_config():
  url = 'ftp://ftp.cmegroup.com/pub/settle/stl{}'
  markets = [LIBOR,FF,WTI,NG,RB]
  pages = ['nymex','int']
  return {'url': url, 'markets': markets, 'pages': pages}

def calibrate(mktdata):
  calibrate_rates(mktdata)
  calibrate_vols(mktdata)

def load_calibrated_data(date):
  filename = filename_calibrated(date)
  if not os.path.isfile(filename): return None
  file = open(filename,'r')
  data = pickle.load(file)
  file.close()

  data.pickle_load_fix_markets()
  return data

def save_calibrated_data(data):
  filename = filename_calibrated(data.pricing_date)
  file = open(filename,'w')
  pickle.dump(data,file)
  file.close()

def filename_calibrated(date):
  return "mktdata/cme-calibrated-" + str(date) + ".bin"

def can_retrieve_now():
  return not dateutils.isNotBizDate(datetime.date.today(),"cme") and datetime.datetime.now().hour >= 16

def filename_raw_data(page,date):
  return "mktdata/cme-" + page + "-" + str(date) + ".mkt"

def is_raw_data_saved(date):
  config = cme_config()
  for page in config['pages']:
    if not os.path.isfile(filename_raw_data(page,date)): 
      return False
  return True

def latest_saved_raw_date():
  today = date.today()
  for delta in range(0,30):
    dt = today - datetime.timedelta(days=delta)
    if is_raw_data_saved(dt): return dt

  raise Exception("cannot find any saved mkt data")
  
def load_page(url,pagename,date,refetch):
  # try to load from a file
  if not refetch:
    try:
      file = open(filename_raw_data(pagename,date),'r')
      contents = file.read()
      file.close()
      return contents
    except Exception as e:
      pass

  # we need to load from the internet. Are we allowed to do that?
  if not can_retrieve_now(): 
    raise Exception("mktdata for " + str(date) + "not found")
 
  # fetch from the CME
  print "loading data from " + url + " for date " + str(date)
  response = urllib2.urlopen(url)
  contents = response.read()
  file = open(filename_raw_data(pagename,date),'w')
  file.write(contents)
  file.close()
  return contents

def parse_quote(quote):
  quote = quote.strip()
  if "'" in quote:
    # print quote
    quote_split = quote.split("'")
    assert len(quote_split)==2

    integer = 0.0
    if len(quote_split[0]): integer = float(quote_split[0])
    thirty_seconds = float(quote_split[1][:2])
    one_twenty_eights = 0.0
    if len(quote_split[1])>2: one_twenty_eights = float(quote_split[1][2:])

    assert one_twenty_eights in [0.0,2.0,5.0,7.0]

    if one_twenty_eights in [2.0,7.0]: one_twenty_eights += 0.5
    value = integer + (thirty_seconds + one_twenty_eights / 10) / 32
    return value
  elif quote == "CAB": return None
  else: return float(quote)

def parse_file(file_contents,config,mktData):
  file_split = file_contents.split("\n")

  all_sections = []
  section = {"type": "none"}

  for line in file_split:
    line_split = line.split(" ")
    if len(line_split)<2: continue

    isFirstDigit = False
    try: 
      int(line_split[0])
      isFirstDigit = True
    except Exception as e: isFirstDigit = False

    line_type = None
    if dateutils.parse_month(line_split[1]) and ("CALL" in line or "PUT" in line):
      all_sections.append(section)
      section = {
        "type": "option",
        "data": [],
        "option type": line_split[-1],
        "month": line_split[1],
        "code": line_split[0],
        "description": " ".join(line_split[2:-1])
      }

    elif dateutils.parse_month(line_split[0]):
      assert section["type"]=="future"
      # print line
      month_str = line[0:5]
      open_str = line[5:15]
      high_str = line[15:26]
      low_str = line[26:36]
      last_str = line[36:46]
      sett_str = line[46:56]
      chg_str = line[56:66]
      est_vol_str = line[66:76]
      # print line
      # print month_str + "|" + open_str + "|" + high_str + "|" + low_str + "|" + last_str + "|" + sett_str + "|" + chg_str + "|" + est_vol_str
      if "----" in sett_str: continue
      section["data"].append({"month": month_str, "settlement": parse_quote(sett_str)});
      
    elif isFirstDigit:
      if section["type"]=="daily option": continue
      assert section["type"]=="option"

      strike_str = line[0:5]
      open_str = line[5:15]
      high_str = line[15:26]
      low_str = line[26:36]
      last_str = line[36:46]
      sett_str = line[46:56]
      chg_str = line[56:66]
      est_vol_str = line[66:76]
      # print line
      # print strike_str + "|" + open_str + "|" + high_str + "|" + low_str + "|" + last_str + "|" + sett_str + "|" + chg_str + "|" + est_vol_str
      if "----" in sett_str: continue
      section["data"].append({"strike": float(strike_str), "settlement": parse_quote(sett_str)});
            
    elif "DAILY" in line and ("CALL" in line or "PUT" in line):
      all_sections.append(section)
      section = {
        "type": "daily option",
        "data": []
      }
    elif line_split[0]=="TOTAL" or line[0]==" " or line.startswith("MTH/") or line.startswith("*** END OF REPORT ***") or line.startswith("STRIKE"):
      all_sections.append(section)
      section = {
        "type": "noise",
        "data": []
      }
    else:
      all_sections.append(section)
      section = {
        "type": "future",
        "code": line_split[0],
        "description": " ".join(line_split[1:]),
        "data": []
      }

  mkts_by_future = {con.cme_future_code: con for con in config['markets'] if con.cme_future_code}
  mkts_by_option = {con.cme_option_code: con for con in config['markets'] if con.cme_option_code}

  for section in all_sections:
    if section['type'] not in ["future","option"]: continue

    if section['type'] == "future":
      code = section['code']
      if code not in mkts_by_future: continue
      mkt = mkts_by_future[code]
      mkt.description = section['description']
      for row in section['data']:
        coord = FuturesCoord(mkt,row['month'])
        mktData.addCoord(coord,row['settlement'])

    if section['type'] == 'option':
      code = section['code']
      if code not in mkts_by_option: continue
      mkt = mkts_by_option[code]
      for row in section['data']:
        coord = OptionPriceCoord(mkt,section['month'],section['option type'],row['strike']*mkt.cme_strike_multiplier)
        mktData.addCoord(coord,row['settlement'])

# mktdata = init()
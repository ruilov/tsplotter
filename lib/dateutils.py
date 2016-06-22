import datetime,holidays,dateutil.easter,calendar
import calendars.usa,calendars.europe

def month_generator(start_month,end_month):
  start_dt = parse_month(start_month)
  end_dt = parse_month(end_month)

  dt = start_dt
  while(dt<=end_dt):
    yield(date_to_month(dt))
    dt = add_months(dt,1)

def dt(a,b):
  return float((b-a).days)/365

def cme_holidays(year_from,year_to):
  cme_holiday_names = [
    "New Year's Day",
    "Martin Luther King, Jr. Day",
    "Washington's Birthday",
    # "Good Friday",
    "Memorial Day",
    "Independence Day",
    "Labor Day",
    "Thanksgiving",
    "Christmas Day"
  ]

  hols = {}
  years = range(year_from,year_to+1)
  for date, name in sorted(holidays.US(years=years).items()):
    name = name.replace(" (Observed)", "")
    if name in cme_holiday_names: hols[date] = name

  # do good friday
  for year in years:
    date = dateutil.easter.easter(year) - datetime.timedelta(days=2)
    name = "Good Friday"
    hols[date] = name

  return hols

def london_bank_holidays(year_from,year_to):
  london_bank_names = [
    "New Year",
    "Good Friday",
    "Easter Monday",
    "Early May Bank Holiday",
    "Spring Bank Holiday",
    "Late Summer Bank Holiday",
    "Christmas Day",
    "Christmas",
    "Boxing Day",
    "Boxing"
  ]
  london_bank_names = [x.lower() for x in london_bank_names]
  hols = {}
  cal = calendars.europe.UnitedKingdom()
  for year in range(year_from,year_to+1):
    for holi in cal.holidays(year):
      dt = holi[0]
      name = holi[1].replace(" Shift","").replace(" shift","").lower()
      if name not in london_bank_names: continue
      if dt.weekday() in [5,6]: continue
      hols[dt] = name
  return hols

def isNotBizDate(date,calendar):
  return date.weekday() in [5,6] or date in holiday_calendars[calendar]

def minusb(date,n,calendar,count_the_date=True):
  if count_the_date:
    while isNotBizDate(date,calendar): date = date - datetime.timedelta(days=1)
  while n>0:
    date = date - datetime.timedelta(days=1)
    while isNotBizDate(date,calendar): date = date - datetime.timedelta(days=1)
    n -= 1
  return date

def x_weekday_of_month(month,weekday,x):
  first_of_month = parse_month(month)
  count = 0
  for off in range(0,32):
    dt2 = first_of_month + datetime.timedelta(days=off)
    if dt2.weekday()==weekday:
      count += 1
      if count==x:
        return dt2
        break
  return None

def add_months(dt,n):
  y = dt.year
  m = dt.month
  day = dt.day
  m += n
  if m > 12:
    y += m/12
    m = m%12
    if m == 0:
      m = 12
      y -= 1
  return datetime.date(y,m,day)

def month_start_date(month):
  dt = parse_month(month)
  return datetime.date(dt.year,dt.month,1)
    
def month_end_date(month):
  dt = parse_month(month)
  (weekday,last) = calendar.monthrange(dt.year,dt.month)
  return datetime.date(dt.year,dt.month,last)

def parse_month(token):
  token = token.lower()
  months = ["JAN","FEB","MAR","APR","MAY","JUN","JLY","AUG","SEP","OCT","NOV","DEC"]

  if len(token)!=5: return None
  if not token[3:5].isdigit(): return None

  for mi,m in enumerate(months):
    if not token.startswith(m) and not token.startswith(m.lower()): continue
    year = int(token[3:5]) + 2000
    return datetime.date(year,mi+1,1)
    
  return None

def date_to_month(date):
  months = ["JAN","FEB","MAR","APR","MAY","JUN","JLY","AUG","SEP","OCT","NOV","DEC"]
  return months[date.month-1] + str(date.year)[2:]

[year_from,year_to] = [2014,2040]
holiday_calendars = {
  "cme": cme_holidays(year_from,year_to),
  "london": london_bank_holidays(year_from,year_to),
}
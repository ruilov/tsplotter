import time
from lib.myseries import MySeries
import lxml.etree as etree

# speed in miles / hour
def tcx(filename,min_speed=-1.0):
  tree = etree.parse(filename)
  root = tree.getroot()
  time_fmt = "%Y-%m-%dT%H:%M:%SZ"

  for child in root.iter("{*}Lap"):
    st = time.mktime(time.strptime(child.get('StartTime'), time_fmt))

  last_dt = None
  last_dist = None
  time_stopped = 0

  ts = MySeries()
  alts = MySeries()

  for child in root.iter('{*}Trackpoint'):
    alt = child.find('{*}AltitudeMeters')
    if alt == None: continue
    alt = alt.text

    dist = float(child.find('{*}DistanceMeters').text)/1.609
    t = time.mktime(time.strptime(child.find('{*}Time').text,time_fmt))
    dt = (t - st)/60/60

    if last_dt and last_dist:
      speed = (dist - last_dist) / (dt - last_dt)
      if speed < min_speed:
        time_stopped += (dt - last_dt) - (dist - last_dist) / min_speed

    last_dt = dt
    last_dist = dist

    ts[dist] = dt-time_stopped
    alts[dist] = float(alt)

    # print str(dist)+"|"+str(time_stopped)+"|"+str(dt-time_stopped)
  return [ts,alts]
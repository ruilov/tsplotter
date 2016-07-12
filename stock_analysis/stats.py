import numpy as np
import math

def print_stds(sector_returns):
  for sector in sector_returns:
    sector_std = np.std(sector_returns[sector]) * math.sqrt(252)
    print(sector,"|",sector_std)

def remove_component(sector_returns,component):
  component_std = np.std(sector_returns[component])
  answer = {}
  for sector in sector_returns:
    sector_std = np.std(sector_returns[sector])    
    corr = sector_returns[sector].corr(sector_returns[component])
    beta = corr * sector_std / component_std
    answer[sector] = sector_returns[sector] - sector_returns[component] * beta
  return answer

def print_corrs(sector_returns):
  print("|",end="")
  for sector1 in sector_returns: print(sector1,"|",end="")
  print("")

  for sector1 in sector_returns:
    print(sector1,"|",end="")
    for sector2 in sector_returns:
      c = sector_returns[sector1].corr(sector_returns[sector2])
      print(c,"|",end="")
    print("")

def print_betas(sector_returns):
  print("|",end="")
  for sector1 in sector_returns: print(sector1,"|",end="")
  print("")

  for sector1 in sector_returns:
    sector1_std = np.std(sector_returns[sector1])
    print(sector1,"|",end="")
    for sector2 in sector_returns:
      sector2_std = np.std(sector_returns[sector2])
      corr = sector_returns[sector2].corr(sector_returns[sector1])
      beta = corr * sector1_std / sector2_std
      print(beta,"|",end="")
    print("")
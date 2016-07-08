import quandl
import matplotlib.pyplot as plt

# JUST LEARNING STUFF

quandl.ApiConfig.api_key = "jv5gSKq_-UbB7qqotxH6"
quandl.ApiConfig.api_version = "2015-04-09"

fields = quandl.Dataset('WIKI/AAPL').data_fields()
mydata = quandl.Dataset('WIKI/AAPL').data()

print mydata[0].date
print fields
print mydata.column_names
# print mydata[0].'Adj.Close'

pandas = mydata.to_pandas()
print type(pandas)
close_series = pandas["Adj. Close"]
print close_series

# close_series.plot()
# plt.show()

print quandl.Database('WIKI').bulk_download_url()
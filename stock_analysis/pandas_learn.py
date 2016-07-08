import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
# plt.style.use('ggplot')

# JUST SOME RANDOM TESTS

s = pd.Series([1,3,5,np.nan,6,8])
print s

dates = pd.date_range('20130101',periods=6)
df = pd.DataFrame(np.random.rand(6,4),index=dates,columns=list('ABCD'))
print df

df2 = pd.DataFrame({ 'A' : 1.,
                      # 'B' : pd.Timestamp('20130102'),
                      'C' : pd.Series(4,index=list(range(4)),dtype='float32'),
                      # 'D' : np.array([3] * 4,dtype='int32'),
                      # 'E' : pd.Categorical(["test","train","test","train"]),
                      'F' : 'foo' })

print df.describe()
print df.at[dates[0],'A']
print df.at[df.index[0],'A']
print df.iloc[0,0]

print df[df.A > .3]

print df.apply(lambda x: x*2)
print ""

rng = pd.date_range('1/1/2012', periods=5, freq='M')
ts = pd.Series(np.random.randint(0, 500, len(rng)), index=rng)
print ts
print ""

print ts.index
ts.plot()
plt.show()

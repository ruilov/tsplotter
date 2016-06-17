from market_objs import *

WTI = Market("WTI","commod",cme_future_code="CL",cme_option_code="LO",cme_strike_multiplier=0.01)
WTI.futures_expiration = lambda month: wti_futures_expiration(month)
WTI.option_expiration = lambda month: dateutils.minusb(WTI.futures_expiration(month),3,"cme")
WTI.start_date = month_start_date
WTI.end_date = month_end_date

NG = Market("NG","commod",cme_future_code="NG",cme_option_code="LN",cme_strike_multiplier=0.001)
NG.futures_expiration = lambda month: dateutils.minusb(month_start_date(month),3,"cme",count_the_date=False)
NG.option_expiration = lambda month: dateutils.minusb(NG.futures_expiration(month),1,"cme")
NG.start_date = month_start_date
NG.end_date = month_end_date

RB = Market("RB","commod",cme_future_code="RB",cme_option_code="OB",cme_strike_multiplier=0.0001)
RB.futures_expiration = lambda month: dateutils.minusb(month_start_date(month),3,"cme",count_the_date=False)
RB.option_expiration = lambda month: dateutils.minusb(NG.futures_expiration(month),1,"cme")
RB.start_date = month_start_date
RB.end_date = month_end_date

LIBOR = Market("LIBOR","rates",cme_future_code="ED")
LIBOR.start_date = lambda month: dateutils.minusb(dateutils.x_weekday_of_month(month,2,3),2,"london")
LIBOR.end_date = lambda month: dateutils.add_months(LIBOR.start_date(month),3)

FF = Market("FF","rates",cme_future_code="FF")
FF.start_date = month_start_date
FF.end_date = month_end_date

MARKETS = [WTI,NG,RB,LIBOR,FF]
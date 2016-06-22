from market_objs import *
import lib.dateutils as du

WTI = Market("WTI","commod",cme_future_code="CL",cme_option_code="LO",cme_strike_multiplier=0.01)
WTI.futures_expiration = lambda month: wti_futures_expiration(month)
WTI.option_expiration = lambda month: du.minusb(WTI.futures_expiration(month),3,"cme")

NG = Market("NG","commod",cme_future_code="NG",cme_option_code="LN",cme_strike_multiplier=0.001)
NG.futures_expiration = lambda month: du.minusb(du.month_start_date(month),3,"cme",count_the_date=False)
NG.option_expiration = lambda month: du.minusb(NG.futures_expiration(month),1,"cme")

RB = Market("RB","commod",cme_future_code="RB",cme_option_code="OB",cme_strike_multiplier=0.0001)
RB.futures_expiration = lambda month: du.minusb(du.month_start_date(month),3,"cme",count_the_date=False)
RB.option_expiration = lambda month: du.minusb(NG.futures_expiration(month),1,"cme")

LIBOR = Market("LIBOR","rates",cme_future_code="ED")
LIBOR.start_date = lambda month: du.minusb(du.x_weekday_of_month(month,2,3),2,"london")
LIBOR.end_date = lambda month: du.add_months(LIBOR.start_date(month),3)

FF = Market("FF","rates",cme_future_code="FF")

MARKETS = [WTI,NG,RB,LIBOR,FF]
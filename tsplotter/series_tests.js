function series_equal(a,b) {
  if(a.type != b.type) return false;

  var keys_a = _.keys(a.map).sort();
  var keys_b = _.keys(b.map).sort();
  if(!_.isEqual(keys_a,keys_b)) return false;

  for(var k of keys_a) {
    var aNaN = isNaN(a.map[k]);
    var bNaN = isNaN(b.map[k]);
    if(aNaN!=bNaN) return false;
    if(Math.abs(a.map[k]-b.map[k]) > 1e-10) return false;
  };
  return true;
};

function run_tests() {
  var s1 = new Series();
  s1.put("0",0);s1.put("3",30);s1.put("1",10);s1.put("2",20);
  var w1 = new Series();
  w1.put("0",1);w1.put("3",30);w1.put("1",10);w1.put("2",20);w1.put("5",45);
  var t1 = new Series();
  t1.put("0",5);t1.put("2",25);t1.put("3",15);t1.put("4",55);t1.put("5",60);

  var s2 = new Series();
  s2.put("2016-01-01",0);s2.put("2016-02-20",30);s2.put("2016-01-03",10);s2.put("2016-01-10",20);
  var w2 = new Series();
  w2.put("2016-01-01",1);w2.put("2016-02-20",30);w2.put("2016-01-03",10);w2.put("2016-01-10",20);w2.put("2016-04-01",45);
  var t2 = new Series();
  t2.put("2016-01-01",5);t2.put("2016-01-10",25);t2.put("2016-02-20",15);t2.put("2016-03-01",55);t2.put("2016-04-01",60);

  // range
  var e1 = new Series();
  e1.put("1",10);e1.put("2",20);
  var a1 = math.eval("bounds(s1,1,2)",{"s1": s1});
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-03",10);e2.put("2016-01-10",20);
  var a2 = math.bounds(s2,"2016-01-03","2016-01-20");
  if(!series_equal(a2,e2)) throw "series test failure";

  // dx
  var e1 = new Series();
  e1.put("1",1);e1.put("2",1);e1.put("3",1);
  var a1 = math.dx(s1);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-03",2);e2.put("2016-01-10",7);e2.put("2016-02-20",41);
  var a2 = math.dx(s2);
  if(!series_equal(a2,e2)) throw "series test failure";  

  // cond
  var temp1 = new Series();
  temp1.put("0",1);temp1.put("1",0);
  var temp2 = new Series();
  temp2.put("0",10);temp2.put("1",20);
  var temp3 = new Series();
  temp3.put("0",1);temp3.put("1",2);

  var e1 = new Series();
  e1.put("0",10);e1.put("1",2);
  var a1 = math.if(temp1,temp2,temp3);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e1 = new Series();
  e1.put("0",30);e1.put("1",2);
  var a1 = math.if(temp1,30,temp3);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e1 = new Series();
  e1.put("0",10);e1.put("1",40);
  var a1 = math.if(temp1,temp2,40);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e1 = new Series();
  e1.put("0",10);e1.put("1",40);
  var a1 = math.eval("if(a,b,40)",{"a":temp1,"b":temp2});
  if(!series_equal(a1,e1)) throw "series test failure";

  // zap
  var e1 = new Series();
  e1.put("1",20);
  var a1 = math.zap(temp1,temp2);
  if(!series_equal(a1,e1)) throw "series test failure";

  // lag
  var e1 = new Series();
  e1.put("2",0);e1.put("3",10);
  var a1 = math.lag(s1,2);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-10",0);e2.put("2016-02-20",10);
  var a2 = math.lag(s2,2);
  if(!series_equal(a2,e2)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-01",20);e2.put("2016-01-03",30);
  var a2 = math.lag(s2,-2);
  if(!series_equal(a2,e2)) throw "series test failure";

  var scope = {a: s1};
  var e1 = math.eval("r(a,2)",scope);
  var a1 = math.eval("a / lag(a,2)",scope);
  if(!series_equal(a1,e1)) throw "series test failure";
  var e1 = math.eval("d(a)",scope);
  var a1 = math.eval("a - lag(a)",scope);
  if(!series_equal(a1,e1)) throw "series test failure";

  var scope = {a: s2};
  var e2 = math.eval("r(a)",scope);
  var a2 = math.eval("a / lag(a)",scope);
  if(!series_equal(a2,e2)) throw "series test failure";
  var e2 = math.eval("d(a,2)",scope);
  var a2 = math.eval("a - lag(a,2)",scope);
  if(!series_equal(a2,e2)) throw "series test failure";

  // subsample
  var e1 = new Series();
  e1.put("0",0);e1.put("2",20);
  var a1 = math.subsample(s1,2);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2= new Series();
  e2.put("2016-01-01",0);e2.put("2016-01-10",20);
  var a2 = math.subsample(s2,2);
  if(!series_equal(a2,e2)) throw "series test failure";

  // interpolate
  var temp1 = new Series();
  temp1.put("0.5",1.5);
  var a1 = math.interpolate(temp1,s1);
  var e1 = new Series();
  e1.put("0",1.5);e1.put("1",1.5);e1.put("2",1.5);e1.put("3",1.5);
  if(!series_equal(a1,e1)) throw "series test failure";

  var temp1 = new Series();
  temp1.put("0",0);temp1.put("1",10);temp1.put("2",20);temp1.put("3",25);
  var temp2 = new Series();
  temp2.put("-0.5", 123);temp2.put("0.5",1.5);temp2.put("3.5",321);
  var a1 = math.interpolate(temp1,temp2);
  var e1 = new Series();
  e1.put("-0.5",-5);e1.put("0.5",5);e1.put("3.5",27.5)
  if(!series_equal(a1,e1)) throw "series test failure";

  var temp1 = new Series();
  temp1.put("2016-01-01",0);temp1.put("2016-01-11",10);temp1.put("2016-01-21",20);temp1.put("2016-01-26",25);
  var temp2 = new Series();
  temp2.put("2015-12-31", 123);temp2.put("2016-01-5",123);temp2.put("2016-01-30",123);
  var a1 = math.interpolate(temp1,temp2);
  var e1 = new Series();
  e1.put("2015-12-31", -1);e1.put("2016-01-5",4);e1.put("2016-01-30",29);
  if(!series_equal(a1,e1)) throw "series test failure";

  // equal
  var e1 = new Series();
  e1.put("0",0);e1.put("1",0);e1.put("2",1);e1.put("3",0);
  var a1 = math.eval("a==20",{"a": s1});
  if(!series_equal(a1,e1)) throw "series test failure";

  var e1 = new Series();
  e1.put("0",0);e1.put("1",1);e1.put("2",1);e1.put("3",1);
  var a1 = math.eval("a==b",{"a": s1, "b": w1});
  if(!series_equal(a1,e1)) throw "series test failure";

  // larger / smaller
  var temp1 = new Series();
  temp1.put("0",2);temp1.put("1",3);temp1.put("2",3)
  var temp2 = new Series();
  temp2.put("0",-2);temp2.put("1",4)
  var e1 = new Series();
  e1.put("0",1);e1.put("1",0);
  var a1 = math.larger(temp1,temp2);
  if(!series_equal(a1,e1)) throw "series test failure";

  var a1 = math.eval("a>b", {"a": temp1, "b": temp2});
  if(!series_equal(a1,e1)) throw "series test failure";

  var e1 = new Series();
  e1.put("0",0);e1.put("1",1);e1.put("2",1);
  var a1 = math.larger(temp1,2.5);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e1 = new Series();
  e1.put("0",0);e1.put("1",1);
  var a1 = math.smaller(temp1,temp2);
  if(!series_equal(a1,e1)) throw "series test failure";

  var a1 = math.eval("a<b", {"a": temp1, "b": temp2});
  if(!series_equal(a1,e1)) throw "series test failure";

  // divide
  var e1 = new Series();
  e1.put("0",2/1);e1.put("1",2/10);e1.put("2",2/20);e1.put("3",2/30);e1.put("5",2/45);
  var a1 = math.divide(2,w1);
  if(!series_equal(a1,e1)) throw "series test failure";

  // pow
  var e1 = new Series();
  e1.put("0",0);e1.put("1",Math.sqrt(10));e1.put("2",Math.sqrt(20));e1.put("3",Math.sqrt(30));
  var a1 = math.pow(s1,0.5);
  if(!series_equal(a1,e1)) throw "series test failure";

  var temp1 = new Series();
  temp1.put("0",2);temp1.put("1",3)
  var temp2 = new Series();
  temp2.put("0",2);temp2.put("1",4)
  var e1 = new Series();
  e1.put("0",4);e1.put("1",81);
  var a1 = math.pow(temp1,temp2);
  if(!series_equal(a1,e1)) throw "series test failure";

  // abs
  var temp1 = new Series();
  temp1.put("0",-2);temp1.put("1",3)
  var e1 = new Series();
  e1.put("0",2);e1.put("1",3);
  var a1 = math.abs(temp1);
  if(!series_equal(a1,e1)) throw "series test failure";

  // max, min
  var temp1 = new Series();
  temp1.put("0",2);temp1.put("1",3);temp1.put("2",3)
  var temp2 = new Series();
  temp2.put("0",-2);temp2.put("1",4)
  var e1 = new Series();
  e1.put("0",2);e1.put("1",4);
  var a1 = math.greater(temp1,temp2);
  if(!series_equal(a1,e1)) throw "series test failure";

  var a1 = math.eval("greater(a,b)", {"a": temp1, "b": temp2});
  if(!series_equal(a1,e1)) throw "series test failure";

  var e1 = new Series();
  e1.put("0",2.5);e1.put("1",3);e1.put("2",3);
  var a1 = math.greater(temp1,2.5);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e1 = new Series();
  e1.put("0",-2);e1.put("1",3);
  var a1 = math.lesser(temp1,temp2);
  if(!series_equal(a1,e1)) throw "series test failure";

  var a1 = math.eval("lesser(a,b)", {"a": temp1, "b": temp2});
  if(!series_equal(a1,e1)) throw "series test failure";

  // sup,inf
  var temp1 = new Series();
  temp1.put("0",10);temp1.put("1",5);temp1.put("2",20);temp1.put("3",2);
  var e1 = new Series();
  e1.put("0",10);e1.put("1",10);e1.put("2",20);e1.put("3",20);
  var a1 = math.sup(temp1);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e1 = new Series();
  e1.put("0",10);e1.put("1",5);e1.put("2",5);e1.put("3",2);
  var a1 = math.inf(temp1);
  if(!series_equal(a1,e1)) throw "series test failure";

  // std
  var e1 = new Series();
  e1.put("0",0);e1.put("1",5);e1.put("2",Math.sqrt(200/3));e1.put("3",Math.sqrt(500/4));
  var a1 = math.std(s1);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-01",0);e2.put("2016-01-03",5);e2.put("2016-01-10",Math.sqrt(200/3));e2.put("2016-02-20",Math.sqrt(500/4));
  var a2 = math.std(s2);
  if(!series_equal(a2,e2)) throw "series test failure";

  var e1 = new Series();
  e1.put("2",Math.sqrt(200/3));e1.put("3",Math.sqrt(200/3));
  var a1 = math.std(s1,3);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-10",Math.sqrt(200/3));e2.put("2016-02-20",Math.sqrt(200/3));
  var a2 = math.std(s2,3);
  if(!series_equal(a2,e2)) throw "series test failure";

  // avg
  var e1 = new Series();
  e1.put("0",0);e1.put("1",5);e1.put("2",10);e1.put("3",15);
  var a1 = math.avg(s1);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-01",0);e2.put("2016-01-03",5);e2.put("2016-01-10",10);e2.put("2016-02-20",15);
  var a2 = math.avg(s2);
  if(!series_equal(a2,e2)) throw "series test failure";

  var e1 = new Series();
  e1.put("2",10);e1.put("3",20);
  var a1 = math.avg(s1,3);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-10",10);e2.put("2016-02-20",20);
  var a2 = math.avg(s2,3);
  if(!series_equal(a2,e2)) throw "series test failure";

  // cum
  var e1 = new Series();
  e1.put("0",0);e1.put("1",10);e1.put("2",30);e1.put("3",60);
  var a1 = math.eval("cum(s1)",{"s1":s1});
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-01",0);e2.put("2016-01-03",10);e2.put("2016-01-10",30);e2.put("2016-02-20",60);
  var a2 = math.cum(s2);
  if(!series_equal(a2,e2)) throw "series test failure";

  var e1 = new Series();
  e1.put("1",10);e1.put("2",30);e1.put("3",50);
  var a1 = math.cum(s1,2);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-03",10);e2.put("2016-01-10",30);e2.put("2016-02-20",50);
  var a2 = math.eval("cum(s2,2)",{"s2":s2});
  if(!series_equal(a2,e2)) throw "series test failure";

  // d
  var e1 = new Series();
  e1.put("1",10);e1.put("2",10);e1.put("3",10);
  var a1 = math.d(s1);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-03",10);e2.put("2016-01-10",10);e2.put("2016-02-20",10);
  var a2 = math.d(s2);
  if(!series_equal(a2,e2)) throw "series test failure";

  var e1 = new Series();
  e1.put("2",20);e1.put("3",20);
  var a1 = math.d(s1,2);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-10",20);e2.put("2016-02-20",20);
  var a2 = math.d(s2,2);
  if(!series_equal(a2,e2)) throw "series test failure";

  // r
  var e1 = new Series();
  e1.put("1",Infinity);e1.put("2",2);e1.put("3",1.5);
  var a1 = math.r(s1);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-03",Infinity);e2.put("2016-01-10",2);e2.put("2016-02-20",1.5);
  var a2 = math.r(s2);
  if(!series_equal(a2,e2)) throw "series test failure";

  var e1 = new Series();
  e1.put("2",Infinity);e1.put("3",3);
  var a1 = math.r(s1,2);
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-01-10",Infinity);e2.put("2016-02-20",3);
  var a2 = math.r(s2,2);
  if(!series_equal(a2,e2)) throw "series test failure";

  // corr
  var e1 = new Series();
  e1.put("3",1);e1.put("5",4.5/Math.sqrt(133/3));
  var a1 = math.corr(w1,t1,"r(x)");
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-02-20",1);e2.put("2016-04-01",4.5/Math.sqrt(133/3));
  var a2 = math.corr(w2,t2,"r(x)");
  if(!series_equal(a2,e2)) throw "series test failure";

  var e1 = new Series();
  e1.put("3",1);e1.put("5",1);
  var a1 = math.corr(w1,t1,2,"d(x)");
  if(!series_equal(a1,e1)) throw "series test failure";

  var e2 = new Series();
  e2.put("2016-02-20",1);e2.put("2016-04-01",Infinity);
  var a2 = math.corr(w2,t2,2,"r(x)");
  if(!series_equal(a2,e2)) throw "series test failure";
};

run_tests();


function parseDate(dateStr) {
  var parts = dateStr.split('-');
  return new Date(parts[0], parts[1]-1, parts[2]); // Note: months are 0-based
}

function dateToStr(dt) {
  var yyyy = dt.getFullYear().toString();
  var mm = (dt.getMonth()+1).toString();
  if(mm.length==1) mm = "0" + mm;
  var dd = dt.getDate().toString();
  if(dd.length==1) dd = "0" + dd;
  return yyyy + "-" + mm + "-" + dd;
}

function floatToStr(x) {
  return x.toString();
}

Array.prototype.getColumn = function(i) {
  return this.map(function(x) {return x[i];});
};

Array.prototype.sum = function() {
  return this.reduce(function(a,b) {return a+b;},0);
};

Array.prototype.average = function() {
  return this.sum() / this.length;
};

Array.prototype.variance = function() {
  var avg = this.average();
  var avg2 = this.map(function(x) {return x*x;}).average();
  return avg2 - avg*avg;
};

Array.prototype.covariance = function(a2) {
  var avg1 = this.average();
  var avg2 = a2.average();
  var coavg = this.map(function(x,i) {return x*a2[i];}).average();
  return coavg - avg1*avg2;
};

function make_series(map) {
  var s = new Series();
  s.map = map;
  var keys = _.keys(map);
  if(keys.length>0) 
    s.type = _type_of_value(keys[0]);
  return s;
}

function _type_of_value(x) {
  if(isFinite(parseDate(x))) return "date";
  if(!isNaN(parseFloat(x))) return "float";
  throw "Unknonw type: " + x;
}

function _parse_func(type) {
  if(type=="date") return parseDate;
  if(type=="float") return parseFloat;
  throw "Unknonw type: " + type;
}

function _toStr_func(type) {
  if(type=="date") return dateToStr;
  if(type=="float") return floatToStr;
  throw "Unknonw type: " + type;
}

function _cast_num_func(type) {
  if(type=="date") return function(x) {return Math.round(x.getTime()/(3600000*24));};
  if(type=="float") return function(x) {return x;};
  throw "Unknonw type: " + type;
}

function parse_value(x) {
  var type = _type_of_value(x);
  var func = _parse_func(type);
  return func(x);
}

function valueToStr(x) {
  if(x instanceof  Date) return _toStr_func("date")(x);
  if(typeof(x)=="number") return _toStr_func("float")(x);
  throw "Unknonw type: " + typeof(x) + " of " + x;
}

class Series {
  constructor() {
    this.map = {};
    this.type = "date";
  }

  parse_func() {
    return _parse_func(this.type);
  }

  toStr_func() {
    return _toStr_func(this.type);
  }

  cast_num_func() {
    return _cast_num_func(this.type);
  }

  put(x,y) {
    if(typeof(x)!="string") throw "not a string: " + x;
    var x_type = _type_of_value(x);
    if(this.isEmpty()) this.type = x_type;
    else if(this.type!=x_type) throw "Unmatched series types: " + this.type + " and " + x_type;
    this.map[x] = y;
  }

  getX(x) {
    if(x in this.map) return this.map[x];
    return null;
  }

  isEmpty() {
    return Object.keys(this.map).length===0;
  }

  clone() {
    var map = {};
    for(var x in this.map) map[x] = this.map[x];
    return make_series(map);
  }

  range(sx,ex) {
    var ans = {};
    var f = this.parse_func();
    for(var x in this.map) {
      var x2 = f(x);
      if(x2>=sx && x2<= ex) ans[x] = this.map[x];
    }
    return make_series(ans);
  }

  asSortedArray() {
    var dataArr = [];
    var f = this.parse_func();
    for(var x in this.map) 
      dataArr.push([f(x),this.map[x]]);
      
    dataArr.sort(function(a,b) {return a[0]-b[0];});
    return dataArr;
  }

  subgenerator(w,otherSeries) {
    var arr = this.asSortedArray();
    var subArr = [];
    var si = 0;
    var ans = [];

    if(otherSeries) var toStr_func = otherSeries.toStr_func();

    while(subArr.length<w && si<arr.length) {
      var elem = arr[si];
      if(otherSeries) {
        var x = toStr_func(elem[0]);
        if(x in otherSeries.map) {
          elem.push(otherSeries.map[x]);
          if(!isNaN(elem[1]) && !isNaN(elem[2])) {
            subArr.push(elem);
          }
        }
      } else {
        if(!isNaN(elem[1])) {
          subArr.push(elem);
        }
      }
      si++;
    }

    if(subArr.length<w) return;

    ans.push(subArr.slice());

    while(si<arr.length) {
      var elem = arr[si];
      if(otherSeries) {
        var x = toStr_func(elem[0]);
        if(x in otherSeries.map) {
          elem.push(otherSeries.map[x]);
          if(!isNaN(elem[1]) && !isNaN(elem[2])) {
            subArr.splice(0,1);
            subArr.push(elem);
            ans.push(subArr.slice());
          }
        }
      } else {
        if(!isNaN(elem[1])) {
          subArr.splice(0,1);
          subArr.push(elem);
          ans.push(subArr.slice());
        }
      }

      si++;
    }

    return ans;
  }

  cumgenerator(otherSeries) {
    var arr = this.asSortedArray();
    var subArr = [];
    var ans = [];

    if(otherSeries) var toStr_func = otherSeries.toStr_func();

    for(var elem of arr) {
      if(otherSeries) {
        var x = toStr_func(elem[0]);
        if(x in otherSeries.map) {
          elem.push(otherSeries.map[x]);
          if(!isNaN(elem[1]) && !isNaN(elem[2])) {
            subArr.push(elem);
            ans.push(subArr.slice());
          }
        }
      } else {
        if(!isNaN(elem[1])) {
          subArr.push(elem);
          ans.push(subArr.slice());
        }
      }
    }
    return ans;
  }
}

Series.prototype.isSeries = true;

function make_constant_series(num,sd,ed) {
  var map;
  if(typeof(sd)=="object") {
    map = {};
    var dt = new Date(sd.getTime());
    for(; dt <= ed; dt.setDate(dt.getDate() + 1))
      map[dateToStr(dt)] = num;
  }

  if(typeof(sd)=="number") {
    map = {};
    for(var idx = sd; idx <= ed; idx++)
      map[floatToStr(idx)] = num;
  }

  return make_series(map);
}

math.typed.addType({
  name: 'Series',
  test: function (x) {return x && x.isSeries;}
});

var unaryMinusFunc = math.typed('unaryMinus', {
  'Series': function (a) {
    return math.multiply(a,-1);
  },
});

var unaryPlusFunc = math.typed('unaryPlus', {
  'Series': function (a) {
    return a;
  },
});

// use the type in a new typed function
var divideFunc = math.typed('divide', {
  'Series, number': function (a, b) {
    var ans = {};
    for(var dt in a.map) ans[dt] = a.map[dt] / b;
    return make_series(ans);
  },
  'number,Series': function (b, a) {
    var ans = {};
    for(var dt in a.map) ans[dt] = b / a.map[dt];
    return make_series(ans);
  },
  'Series, Series': function(a,b) {
    var ans = {};
    for(var dt in a.map) 
      if(dt in b.map) ans[dt] = a.map[dt] / b.map[dt];
    return make_series(ans);
  },
});

var multiplyFunc = math.typed('multiply', {
  'Series, number': function (a, b) {
    var ans = {};
    for(var dt in a.map) ans[dt] = a.map[dt] * b;
    return make_series(ans);
  },
  'number, Series': function (a, b) { 
    return math.multiply(b,a); 
  },
  'Series, Series': function(a,b) {
    var ans = {};
    for(var dt in a.map) 
      if(dt in b.map) ans[dt] = a.map[dt] * b.map[dt];
    return make_series(ans);
  },
});

var powFunc = math.typed('pow', {
  'Series, number': function (a, b) {
    var ans = {};
    for(var dt in a.map) ans[dt] = Math.pow(a.map[dt],b);
    return make_series(ans);
  },
  'number, Series': function (b, a) { 
    var ans = {};
    for(var dt in a.map) ans[dt] = Math.pow(b,a.map[dt]);
    return make_series(ans);
  },
  'Series, Series': function(a,b) {
    var ans = {};
    for(var dt in a.map) 
      if(dt in b.map) ans[dt] = Math.pow(a.map[dt],b.map[dt]);
    return make_series(ans);
  },
});

var addFunc = math.typed('add', {
  'Series, number': function (a, b) {
    var ans = {};
    for(var dt in a.map) ans[dt] = a.map[dt] + b;
    return make_series(ans);
  },
  'number, Series': function (a, b) { 
    return math.add(b,a); 
  },
  'Series, Series': function(a,b) {
    var ans = {};
    for(var dt in a.map) 
      if(dt in b.map) ans[dt] = a.map[dt] + b.map[dt];
    return make_series(ans);
  },
});

var subtractFunc = math.typed('subtract', {
  'Series, number': function (a, b) {
    var ans = {};
    for(var dt in a.map) ans[dt] = a.map[dt] - b;
    return make_series(ans);
  },
  'number, Series': function (a, b) { 
    var ans = math.subtract(b,a);
    return math.multiply(ans,-1); 
  },
  'Series, Series': function(a,b) {
    var ans = {};
    for(var dt in a.map) 
      if(dt in b.map) ans[dt] = a.map[dt] - b.map[dt];
    return make_series(ans);
  },
});

var maxFunc = math.typed('max', {
  'Series, number': function (a, b) {
    var ans = {};
    for(var dt in a.map) ans[dt] = Math.max(a.map[dt],b);
    return make_series(ans);
  },
  'number, Series': function (a, b) {
    return math.max(b,a);
  },
  'Series, Series': function(a,b) {
    var ans = {};
    for(var dt in a.map) 
      if(dt in b.map) ans[dt] = Math.max(a.map[dt],b.map[dt]);
    return make_series(ans);
  },
});

var minFunc = math.typed('min', {
  'Series, number': function (a, b) {
    var ans = {};
    for(var dt in a.map) ans[dt] = Math.min(a.map[dt],b);
    return make_series(ans);
  },
  'number, Series': function (a, b) {
    return math.min(b,a);
  },
  'Series, Series': function(a,b) {
    var ans = {};
    for(var dt in a.map) 
      if(dt in b.map) ans[dt] = Math.min(a.map[dt],b.map[dt]);
    return make_series(ans);
  },
});

var logFunc = math.typed('log', {
  'Series': function (a) {
    var ans = {};
    for(var dt in a.map) ans[dt] = Math.log(a.map[dt]);
    return make_series(ans);
  },
  'Series, number': function (a,b) {
    var ans = {};
    var div = Math.log(b);
    for(var dt in a.map) ans[dt] = Math.log(a.map[dt]) / div;
    return make_series(ans);
  },
});

var absFunc = math.typed('abs', {
  'Series': function (a) {
    var ans = {};
    for(var dt in a.map) ans[dt] = Math.abs(a.map[dt]);
    return make_series(ans);
  }
});

var indFunc = math.typed('ind', {
  'Series': function (a) {
    var arr = a.asSortedArray();
    var ans = {};
    var toStr_func = a.toStr_func();
    for(var i=0; i<arr.length; i++) ans[toStr_func(arr[i][0])] = arr[i][1] / arr[0][1];
    return make_series(ans);
  },
});

var lastFunc = math.typed("last",{
  'Series': function(s) {
    var arr = s.asSortedArray();
    if(arr.length===0) return s;
    var val = arr[arr.length-1][1];

    var ans = {};
    for(var k in s.map) ans[k] = val;
    return make_series(ans);
  }
});

var firstFunc = math.typed("first",{
  'Series': function(s) {
    var arr = s.asSortedArray();
    if(arr.length===0) return s;
    var val = arr[0][1];
    
    var ans = {};
    for(var k in s.map) ans[k] = val;
    return make_series(ans);
  }
});

// dateFunc converts the date into categories
// this function returns a new series where the dates are the same as in series
// the values are averaged within each category
function dateBasedAvg(series,dateFunc) {
    var values = {};
    for(var dt in series.map) {
      var cat = dateFunc(dt);
      if(!(cat in values)) values[cat] = [];
      values[cat].push(series.map[dt])
    };

    var avgs = {};
    for(var cat in values)
      avgs[cat] = values[cat].average();

    var ans = {};
    for(var dt in series.map) ans[dt] = avgs[dateFunc(dt)];
    return make_series(ans);
}

var yearlyAvgFunc = math.typed('yearlyAvg', {
  'Series': function (s) {
    return dateBasedAvg(s,function(dt) {return dt.split('-')[0];});
  },
});

var monthlyAvgFunc = math.typed('monthlyAvg', {
  'Series': function (s) {
    return dateBasedAvg(s,function(dt) {var sp = dt.split("-"); return sp[0]+"-"+sp[1];});
  },
});

// WINDOW FUNCTIONS

function funcOnGenerator(generator,calcFunc,toStr_func) {
  var ans = {};
  for(var sub of generator)
    ans[toStr_func(sub[sub.length-1][0])] = calcFunc(sub.getColumn(1));
  return make_series(ans);
}

function constructStd(generator,toStr_func) {
  var calcFunc = function(values) {
    return Math.sqrt(values.variance());
  };
  return funcOnGenerator(generator,calcFunc,toStr_func);
}

var stdFunc = math.typed('std',{
  'Series, number, string': function(s,w,preFunc) {
    var s2 = math.eval(preFunc,{"x": s});
    return math.std(s2,w);
  },
  'Series, number': function(s,w) {
    return constructStd(s.subgenerator(w),s.toStr_func());
  },
  'Series, string': function(s,preFunc) {
    var s2 = math.eval(preFunc,{"x": s});
    return math.std(s2);
  },
  'Series': function(s) {
    return constructStd(s.cumgenerator(),s.toStr_func());
  },
});

function constructAvg(generator,toStr_func) {
  var calcFunc = function(values) {
    return values.average();
  };
  return funcOnGenerator(generator,calcFunc,toStr_func);
}

var avgFunc = math.typed('avg',{
  'Series, number': function(s,w) {
    return constructAvg(s.subgenerator(w),s.toStr_func());
  },
  'Series': function(s) {
    return constructAvg(s.cumgenerator(),s.toStr_func());
  },
});

function constructMax(generator,toStr_func) {
  var calcFunc = function(values) {
    return _.max(values);
  };
  return funcOnGenerator(generator,calcFunc,toStr_func);
}

var maxCumFunc = math.typed('max_cum', {
  'Series, number': function(s,w) {
    return constructMax(s.subgenerator(w),s.toStr_func());
  },
  'Series': function(s) {
    return constructMax(s.cumgenerator(),s.toStr_func());
  },
});

function constructMin(generator,toStr_func) {
  var calcFunc = function(values) {
    return _.min(values);
  };
  return funcOnGenerator(generator,calcFunc,toStr_func);
}

var minCumFunc = math.typed('min_cum', {
  'Series, number': function(s,w) {
    return constructMin(s.subgenerator(w),s.toStr_func());
  },
  'Series': function(s) {
    return constructMin(s.cumgenerator(),s.toStr_func());
  },
});

function constructCum(generator,toStr_func) {
  var calcFunc = function(values) {
    return _.reduce(values,function(x,y) {return x+y;},0);
  };
  return funcOnGenerator(generator,calcFunc,toStr_func);
}

function constructProd(generator,toStr_func) {
  var calcFunc = function(values) {
    return _.reduce(values,function(x,y) {return x*y;},1);
  };
  return funcOnGenerator(generator,calcFunc,toStr_func);
}

var cumFunc = math.typed('cum',{
  'Series, number': function(s,w) {
    return constructCum(s.subgenerator(w),s.toStr_func());
  },
  'Series': function(s) {
    return constructCum(s.cumgenerator(),s.toStr_func());
  },
});

var prodFunc = math.typed('prod',{
  'Series, number': function(s,w) {
    return constructProd(s.subgenerator(w),s.toStr_func());
  },
  'Series': function(s) {
    return constructProd(s.cumgenerator(),s.toStr_func());
  },
});

var dFunc = math.typed('d',{
  'Series': function(s) {
    return math.d(s,1);
  },
  'Series,number': function(s,w) {
    var ans = {};
    var f = s.toStr_func();
    for(var sub of s.subgenerator(w+1)) {
      var val = sub[w][1] - sub[0][1];
      ans[f(sub[sub.length-1][0])] = val;
    }
    return make_series(ans);
  },
});

var rFunc = math.typed('r',{
  'Series': function(s) {
    return math.r(s,1);
  },
  'Series,number': function(s,w) {
    var ans = {};
    var f = s.toStr_func();
    for(var sub of s.subgenerator(w+1)) {
      var val = sub[w][1] / sub[0][1];
      ans[f(sub[sub.length-1][0])] = val;
    }
    return make_series(ans);
  },
});

var volFunc = math.typed('vol',{
  'Series, number': function(s,w) {
    var formula = "std(r(myvar)," + w + ")*sqrt(252)";
    var scope = {"myvar": s};
    return math.eval(formula,scope);
  },
  'Series': function(s) {
    var formula = "std(r(myvar))*sqrt(252)";
    var scope = {"myvar": s};
    return math.eval(formula,scope);
  },
});

function constructCorr(generator,toStr_func) {
  var ans = {};
  for(var sub of generator) {
    if(sub.length<2) continue;
    var col1 = sub.getColumn(1);
    var col2 = sub.getColumn(2);
    var variance1 = col1.variance();
    var variance2 = col2.variance();
    var covariance = col1.covariance(col2);
    ans[toStr_func(sub[sub.length-1][0])] = covariance / Math.sqrt(variance1*variance2);
  }
  return make_series(ans);
}

function align_series(s1,s2,preFunc) {
    var m1 = {};
    var m2 = {};
    for(var x in s1.map) {
      if(x in s2.map) {
        m1[x] = s1.map[x];
        m2[x] = s2.map[x];
      }
    }
    var e1 = math.eval(preFunc,{"x": make_series(m1)});
    var e2 = math.eval(preFunc,{"x": make_series(m2)});
    return [e1,e2];
}

var corrFunc = math.typed('corr',{
  'Series, Series': function(s1,s2) {
    return math.corr(s1,s2,"x");
  },
  'Series, Series, string': function(sa1,sa2,preFunc) {
    [s1,s2] = align_series(sa1,sa2,preFunc);
    return constructCorr(s1.cumgenerator(s2),s1.toStr_func());
  },
  'Series, Series, number': function(s1,s2,w) {
    return math.corr(s1,s2,w,"x");
  },
  'Series, Series, number, string': function(s1,s2,w,preFunc) {
    [s1,s2] = align_series(s1,s2,preFunc);
    return constructCorr(s1.subgenerator(w,s2),s2.toStr_func());
  },
});

var betaFunc = math.typed('beta',{
  'Series, Series': function(s1,s2) {
    return math.beta(s1,s2,"x");
  },
  'Series, Series, string': function(s1,s2,preFunc) {
    var formula = "corr(s1,s2,\"" + preFunc + "\") / std(s1,\"" + preFunc + "\") * std(s2,\"" + preFunc + "\")";
    var scope = {"s1": s1, "s2": s2};
    return math.eval(formula,scope);
  },
  'Series, Series, number': function(s1,s2,w) {
    return math.beta(s1,s2,w,"x");
  },
  'Series, Series, number, string': function(s1,s2,w,preFunc) {
    var formula = "corr(s1,s2," + w + ",\"" + preFunc + "\") / std(s1," + w + ",\"" + preFunc + "\") * std(s2," + w + ",\"" + preFunc + "\")";
    var scope = {"s1": s1, "s2": s2};
    return math.eval(formula,scope);
  },
});

var lagFunc = math.typed('lag',{
  'Series': function(s) {
    return math.lag(s,1);
  },
  'Series, number': function(s,lag) {
    var arr = s.asSortedArray();
    var toStr_func = s.toStr_func();
    var ans = {};

    for(var i = Math.abs(lag); i < arr.length; i++) {
      if(lag>0) ans[toStr_func(arr[i][0])] = arr[i-lag][1];
      else ans[toStr_func(arr[i+lag][0])] = arr[i][1];
    }
    return make_series(ans);
  },
});

var subSampleFunc = math.typed('subsample',{
  'Series, number': function(s,w) {
    var arr = s.asSortedArray();
    var toStr_func = s.toStr_func();
    var ans = {};
    for(var i = 0; i < arr.length; i += w) 
      ans[toStr_func(arr[i][0])] = arr[i][1];
    return make_series(ans);
  },
});

var interpolateFunc = math.typed('interpolate',{
  'Series, Series': function(s1,s2) {
    var a1 = s1.asSortedArray();
    if(a1.length===0) return math.divide(s2,0); // return error
    if(a1.length==1) {
      return math.add(math.multiply(s2,0),a1[0][1]);
    }
    
    var xs = a1.getColumn(0);
    var ys = a1.getColumn(1);

    ans = {};
    var parse_func = s2.parse_func();
    for(var x in s2.map) {
      var parsedX = parse_func(x);
      var idx = _.sortedIndex(xs,parsedX);

      if(idx===0) idx += 1;
      if(idx==xs.length) idx -= 1;

      var prevX = xs[idx-1];
      var nextX = xs[idx];
      var prevY = ys[idx-1];
      var nextY = ys[idx];

      var interpVal;
      if(nextX == prevX) interpVal = (prevY+nextY)/2;
      else interpVal = (nextY - prevY) / (nextX - prevX) * (parsedX - prevX) + prevY;

      ans[x] = interpVal;
    }
    return make_series(ans);
  },
});

var equalFunc = math.typed("equal",{
  'Series, number': function(s,n) {
    var ans = {};
    for(var x in s.map) 
      ans[x] = ((Math.abs(s.map[x]-n)<1e-10)? 1 : 0);

    return make_series(ans);
  },
  'number, Series': function(n,s) {
    return math.equal(s,n);
  },
  'Series, Series': function(a,b) {
    var ans = {};
    for(var dt in a.map) 
      if(dt in b.map) ans[dt] = ((Math.abs(a.map[dt]-b.map[dt])<1e-10)? 1 : 0);
    return make_series(ans);
  },
});

var largerFunc = math.typed('larger',{
  'Series, number': function(s,n) {
    var ans = {};
    for(var x in s.map) 
      ans[x] = ((s.map[x]-n>1e-10)? 1 : 0);

    return make_series(ans);
  },
  'number, Series': function(n,s) {
    return math.smaller(s,n);
  },
  'Series, Series': function(a,b) {
    var ans = {};
    for(var x in a.map) 
      if(x in b.map) ans[x] = ((a.map[x]-b.map[x]>1e-10)? 1 : 0);
    return make_series(ans);
  },
});

var smallerFunc = math.typed('smaller',{
  'Series, number': function(s,n) {
    var ans = {};
    for(var x in s.map) 
      ans[x] = ((s.map[x]-n<-1e-10)? 1 : 0);

    return make_series(ans);
  },
  'number, Series': function(n,s) {
    return math.larger(s,n);
  },
  'Series, Series': function(a,b) {
    var ans = {};
    for(var x in a.map) 
      if(x in b.map) ans[x] = ((a.map[x]-b.map[x]<-1e-10)? 1 : 0);
    return make_series(ans);
  }
});

var condFunc = math.typed('cond',{
  'Series, Series, Series': function(s1,s2,s3) {
    var ans = {};
    for(var x in s1.map) {
      if(x in s2.map && x in s3.map) { 
        ans[x] = s1.map[x]? s2.map[x] : s3.map[x];
      }
    }
    return make_series(ans);
  },
  'Series, number, Series': function(s1,n,s3) {
    var ans = {};
    for(var x in s1.map) {
      if(x in s3.map) { 
        ans[x] = s1.map[x]? n : s3.map[x];
      }
    }
    return make_series(ans);
  },
  'Series, Series, number': function(s1,s2,n) {
    var ans = {};
    for(var x in s1.map) {
      if(x in s2.map) { 
        ans[x] = s1.map[x]? s2.map[x] : n;
      }
    }
    return make_series(ans);
  },
  'Series, number, number': function(s1,n1,n2) {
    var ans = {};
    for(var x in s1.map) {
      ans[x] = s1.map[x]? n1 : n2;
    }
    return make_series(ans);
  }
});

var zapFunc = math.typed('zap',{
  'Series, Series': function(s1,s2) {
    var ans = {};
    for(var x in s1.map) {
      if(x in s2.map && !s1.map[x]) { 
        ans[x] = s2.map[x];
      }
    }
    return make_series(ans);
  },
});

var keepFunc = math.typed('keep',{
  'Series, Series': function(s1,s2) {
    var ans = {};
    for(var x in s1.map) {
      if(x in s2.map && s1.map[x]) { 
        ans[x] = s2.map[x];
      }
    }
    return make_series(ans);
  },
});

var unionFunc = math.typed('union',{
  '...Series': function(sarr) {
    var ans = {};
    for(var idx = sarr.length-1; idx >= 0; idx--) 
      for(var x in sarr[idx].map) ans[x] = sarr[idx].map[x];
    return make_series(ans);
  }
});

var expFunc = math.typed('exp',{
  'Series': function(s) {
    return math.pow(Math.exp(1),s);
  }
});

var dxFunc = math.typed('dx',{
  'Series': function(s) {
    return math.dx(s,1);
  },
  'Series, number': function(s,w) {
    var arr = s.asSortedArray();
    var cast_num_func = s.cast_num_func();
    var toStr_func = s.toStr_func();
    var ans = {};
    for(var i = 0; i < arr.length-w; i += 1) 
      ans[toStr_func(arr[i+1][0])] = cast_num_func(arr[i+w][0]) - cast_num_func(arr[i][0]);
    return make_series(ans);
  }
});

var boundsFunc = math.typed('bounds',{
  'Series, string, string': function(s,sd,ed) {
    var parse_func = s.parse_func();
    var cast_num_func = s.cast_num_func();
    return math.bounds(s, cast_num_func(parse_func(sd)), cast_num_func(parse_func(ed)) );
  },

  'Series, number, number': function(s,sx,ex) {
    var ans = {};
    var cast_num_func = s.cast_num_func();
    var parse_func = s.parse_func();
    for(var x in s.map) {
      var xn = cast_num_func(parse_func(x));
      if(xn>=sx && xn<=ex) ans[x] = s.map[x];
    }
    return make_series(ans);
  },
});

var trendFunc = math.typed('trend',{
  'Series': function(b) {
    var arr = b.asSortedArray();
    if(arr.length<=1) return b;

    // calculate the x values
    var cast_num_func = b.cast_num_func();
    var toStr_func = b.toStr_func();
    var x0 = cast_num_func(arr[0][0]);
    var map = {};
    for(var elem of arr) {
      var dx = cast_num_func(elem[0]) - x0;
      map[toStr_func(elem[0])] = dx;
    }
    var a = make_series(map);

    // calculate the beta
    var beta = math.eval("beta(a,b)",{"a":a,"b":b});
    var beta_arr = beta.asSortedArray();
    var last_beta = beta_arr[beta_arr.length-1][1];

    // take the averages of the two series
    var vals_a = _.values(map);
    var avg_a = _.reduce(vals_a,function(x,y) {return x+y;},0) / vals_a.length;
    var vals_b = arr.getColumn(1);
    var avg_b = _.reduce(vals_b,function(x,y) {return x+y;},0) / vals_b.length;

    // finally generate the answer
    var formula = last_beta + "*(a-"+avg_a+") + "+avg_b;
    var ans = math.eval(formula,{"a":a});
    return ans;
  },
});

var daily = math.typed('daily',{
  '': function() {
    return 1;
  }
});

// extend the existing functions with support for Series
var to_import = {
  unaryMinus: unaryMinusFunc,
  unaryPlus: unaryPlusFunc,

  divide: divideFunc, 
  multiply: multiplyFunc, 
  pow: powFunc,
  add: addFunc,
  subtract: subtractFunc,
  max: maxFunc,
  min: minFunc,
  abs: absFunc,
  log: logFunc,
  ind: indFunc,
  last: lastFunc,
  first: firstFunc,
  max_cum: maxCumFunc,
  min_cum: minCumFunc,

  std: stdFunc,
  avg: avgFunc,
  cum: cumFunc,
  prod: prodFunc,

  d: dFunc,
  r: rFunc,
  vol: volFunc,

  corr: corrFunc,
  lag: lagFunc,
  subsample: subSampleFunc,
  interpolate: interpolateFunc,

  equal: equalFunc,
  larger: largerFunc,
  smaller: smallerFunc,
  if: condFunc,
  zap: zapFunc,
  keep: keepFunc,
  union: unionFunc,
  exp: expFunc,
  dx: dxFunc,
  bounds: boundsFunc,
  beta: betaFunc,
  trend: trendFunc,
  daily: daily,

  yearlyAvg: yearlyAvgFunc,
  monthlyAvg: monthlyAvgFunc,
};

// this allows every function to be called with a number as a first argument, and the number is converted to a series
var make_num_to_series_transform = function(f) {
  f.transform = function() {
    if(arguments.length===0) return f();

    if(typeof arguments[0] == 'number') 
      arguments[0] = make_constant_series(arguments[0],thePage.evaluator.start,thePage.evaluator.end);

    // apply doesn't seem to work. Why not?
    if(arguments.length==1) return f(arguments[0]);
    if(arguments.length==2) return f(arguments[0],arguments[1]);
    if(arguments.length==3) return f(arguments[0],arguments[1],arguments[2]);
    if(arguments.length==4) return f(arguments[0],arguments[1],arguments[2],arguments[3]);
    if(arguments.length==5) return f(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);
    if(arguments.length==6) return f(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);
  };
};

for(var funcName in to_import) 
  make_num_to_series_transform(to_import[funcName]);

math.import(to_import);

/**********************************************************
*
* syntactic sugar
*
*********************************************************/

var strip_func = function(root,start_month,num_months) {
  var month_codes = ['F','G','H','J','K','M','N','Q','U','V','X','Z'];
  var month_letter = start_month.substring(0,1);
  var month_idx = month_codes.indexOf(month_letter);
  var year = parseInt(start_month.substring(1));

  var formula = "(";
  for(var i=0; i < num_months; i++) {
    formula += root + month_codes[month_idx] + year;
    if(i<num_months-1) formula += "+";

    month_idx++;
    if(month_idx == 12) {
      month_idx = 0;
      year++;
    }
  }
  formula += ")/" + num_months;
  return formula;
};

math.import_syntactic_sugar("strip", strip_func);

var nrby_strip_func = function(root,start_month,num_months) {
  var formula = "(";
  for(var i=start_month; i < start_month+num_months; i++) {
    formula += root + i;
    if(i<start_month+num_months-1) formula += "+";
  }
  formula += ")/" + num_months;
  return formula;
}

math.import_syntactic_sugar("nrby_strip", nrby_strip_func);
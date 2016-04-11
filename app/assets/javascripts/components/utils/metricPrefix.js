 const metPrefSymbols = {
   micro: '\u03BC',
   milli: "m",
   centi: "c",
   deci: "d",
   none: "",
   kilo: "k"
 }
 const metPref = {
   micro:    0.000001,
   milli:    0.001,
   centi:    0.01,
   deci:     0.1,
   none:     1.0,
   kilo:  1000.0,

 }

 const metPreConv = (value,fromMP, toMP)=> metPref[fromMP]/metPref[toMP]*value;

module.exports = {metPreConv,metPrefSymbols};

const metPrefSymbols = {
  u: '\u03BC', // micro
  m: 'm',      // milli
  c: 'c',      // centi
  d: 'd',      // deci
  n: '',       // none
  k: 'k'       // kilo
};

const metPref = {
  u:    0.000001,
  m:    0.001,
  c:    0.01,
  d:     0.1,
  n:     1.0,
  k:  1000.0,
};

const metPreConv = (value, fromMP, toMP) => (metPref[fromMP] / metPref[toMP]) * value;

export { metPreConv, metPrefSymbols };

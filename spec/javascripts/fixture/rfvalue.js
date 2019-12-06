const rfValues = {
    '123,45': {
      rfValue: '123,45',
      expected: '123,45'
    },
    '15.2 min': {
      rfValue: '15.2 min',
      expected: '15.2 min'
    },
    '0,688': {
      rfValue: '0,688',
      expected: '0.688'
    },
    '0.53 (A), 0.50 (B), 0.57 (C)': {
      rfValue: '0.53 (A), 0.50 (B), 0.57 (C)',
      expected: '0.53 (A), 0.50 (B), 0.57 (C)'
    },
    '0,46 (DiaS)  + 0,42 (DiaA)': {
      rfValue: '0,46 (DiaS)  + 0,42 (DiaA)',
      expected: '0.46 (DiaS)  + 0.42 (DiaA)'
    },
    '0,47 0,53': {
      rfValue: '0,47 0,53',
      expected: '0.47 0.53'
    },
    '0,47, 0.123 0,53': {
      rfValue: '0,47, 0.123 0,53',
      expected: '0.47, 0.123 0.53'
    },
    '0,5625': {
      rfValue: '0,5625',
      expected: '0.5625'
    },
    '0.39 ;  0.15': {
      rfValue: '0.39 ;  0.15',
      expected: '0.39 ;  0.15'
    },
    '0': {
      rfValue: '0',
      expected: '0'
    },
    '': {
      rfValue: '',
      expected: ''
    },
    'null': {
      rfValue: null,
      expected: null
    },
    'undefined': {
      rfValue: undefined,
      expected: undefined
    }
  };

  export { rfValues };


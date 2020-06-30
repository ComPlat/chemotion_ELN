import React from 'react';

const minusRender = name => (
  <span key={`${name}_key`} id={`${name}_id`} style={{ marginRight: '10px', cursor: 'pointer' }}>
    <i className="fa fa-minus" />
  </span>
);

const reactionToolbarSymbol = [
  {
    name: 'ndash',
    ops: [
      { insert: '–' },
    ],
    render: minusRender,
  },
  {
    name: 'water-free',
    ops: [
      { insert: 'The reaction has been conducted in dry glass ware under inert atmosphere.' },
    ],
  },
  {
    name: 'resin-solvent',
    ops: [
      { insert: 'The resin (xxx mg, loading = X.XX g/mol, XX.X mmol) was swollen in xx mL of SOLVENT for xx min at room temperature.' },
    ],
  },
  {
    name: 'resin-solvent-reagent',
    ops: [
      { insert: 'The resin (xxx mg, loading = X.XX g/mol, XX.X mmol) was filled into a 10 mL crimp cap vial and was swollen in xx mL of SOLVENT. After xx min, xxx.x mg of REAGENT (XX.X mmol, XX.X equiv.) and XX.X mg of REAGENT (XX.X mg, XX.X mmol, X.XX equiv.) were added. The reaction mixture was shaken at XX °C for XX h.' },
    ],
  },
  {
    name: 'hand-stop',
    ops: [
      { insert: 'After complete conversion of the starting material, the reaction was quenched ' },
      {
        insert: 'via',
        attributes: { italic: true },
      },
      { insert: ' careful addition of saturated NaHCO' },
      {
        insert: '3',
        attributes: { script: 'sub' },
      },
      { insert: '-solution.' },
    ],
  },
  {
    name: 'reaction-procedure',
    ops: [
      { insert: 'The reaction mixture was poured into a glass funnel with filter paper and the polymer beads were washed XX times according to the following procedure: (1) SOLVENT [x repetitions] (2)  SOLVENT [x repetitions] (3)  SOLVENT [x repetitions] (4)  SOLVENT [x repetitions] (5)  SOLVENT [x repetitions].' },
    ],
  },
  {
    name: 'gpx-a',
    ops: [
      { insert: 'According to GPX, AMOUNT g (XXX mmol, XX equiv.) of STARTING MATERIAL were reacted with XX.X mL (XX.X mg, XX.X mmol, X.XX equiv.) of REAGENT und X.XX mg (24.0 mmol, 5.00 equiv.) of REAGENT in XX mL of SOLVENT at XX °C for XX h.' },
    ],
  },
  {
    name: 'gpx-b',
    ops: [
      { insert: 'According to GPX, AMOUNT g (XXX mmol, XX equiv.) of STARTING MATERIAL were reacted with XX.X mL (XX.X mg, XX.X mmol, X.XX equiv.) of REAGENT und X.XX mg (24.0 mmol, 5.00 equiv.) of REAGENT in XX mL of SOLVENT at XX °C for XX h.' },
    ],
  },
  {
    name: 'washed-nahco3',
    ops: [
      { insert: 'The reaction mixture was poured into a separation funnel and the organic layer was washed successively with xx mL of NaHCO' },
      {
        attributes: { script: 'sub' },
        insert: '3',
      },
      { insert: '-solution, xx mL of brine and xx mL of water. The aqueous layers were recombined and reextracted with ethyl acetate.\nThe organic layers were collected and were dried by the addition of Na' },
      {
        attributes: { script: 'sub' },
        insert: '2',
      },
      { insert: 'SO' },
      {
        attributes: { script: 'sub' },
        insert: '4',
      },
      { insert: '/MgSO' },
      {
        attributes: { script: 'sub' },
        insert: '4',
      },
      { insert: '. The mixture was filtered through a glass funnel and the solvent was evaporated under reduced pressure.' },
    ],
  },
  {
    name: 'acidified-hcl',
    ops: [
      { insert: 'The reaction mixture was poured into a separation funnel and was acidified by the addition of 1 M HCl. The aqueous layer was collected and adjusted to pH 8-9 by addition of saturated NaHCO' },
      {
        attributes: { script: 'sub' },
        insert: '3',
      },
      { insert: '-solution. xx mL of SOLVENT were added and the aqueous phase was extracted three times. After washing with brine and water, the organic layers were collected and were dried by the addition of Na' },
      {
        attributes: { script: 'sub' },
        insert: '2',
      },
      { insert: 'SO' },
      {
        attributes: { script: 'sub' },
        insert: '4',
      },
      { insert: '/MgSO' },
      {
        attributes: { script: 'sub' },
        insert: '4',
      },
      { insert: '. The mixture was filtered through a glass funnel and the solvent was evaporated under reduced pressure.' },
    ],
  },
  {
    name: 'tlc-control',
    ops: [
      { insert: 'The progress of the reaction was observed via TLC control (cyclohexane:ethyl acetate; xx:xx; R' },
      {
        attributes: {
          italic: true,
          script: 'sub',
        },
        insert: 'f = ',
      },
      { insert: '0.XX).' },
    ],
  },
  {
    name: 'dried',
    ops: [
      { insert: 'The combined organic layers were dried by the addition of Na' },
      {
        attributes: { script: 'sub' },
        insert: '2',
      },
      { insert: 'SO' },
      {
        attributes: { script: 'sub' },
        insert: '4',
      },
      { insert: '/MgSO' },
      {
        attributes: { script: 'sub' },
        insert: '4',
      },
      { insert: '. The mixture was filtered through a glass funnel and the solvent was evaporated under reduced pressure.' },
    ],
  },
  {
    name: 'isolated',
    ops: [
      { insert: 'The target compound was isolated by filtering of the resulting mixture through a glass funnel and was washed AMOUNT times with SOLVENT.' },
    ],
  },
  {
    name: 'residue-purified',
    ops: [
      { insert: 'The crude residue was purified ' },
      {
        attributes: { italic: true },
        insert: 'via',
      },
      { insert: ' column chromatography (cyclohexane:ethyl acetate; xx:xx → cyclohexane:ethyl acetate; xx:xx). The target compound was isolated as a colorless solid in xx% yield (xx mg, xx mmol). R' },
      {
        attributes: {
          italic: true,
          script: 'sub',
        },
        insert: 'f = ',
      },
      { insert: '0.XX (cyclohexane:ethyl acetate).' },
    ],
  },
  {
    name: 'residue-adsorbed',
    ops: [
      { insert: 'The crude residue was adsorbed on a small amount of silica gel/Celite and was purified ' },
      {
        attributes: { italic: true },
        insert: 'via',
      },
      { insert: ' column chromatography (cyclohexane:ethyl acetate; xx:xx → cyclohexane:ethyl acetate; xx:xx). The target compound was isolated as a colorless solid in xx% yield (xx mg, xx mmol). R' },
      {
        attributes: {
          italic: true,
          script: 'sub',
        },
        insert: 'f = ',
      },
      { insert: '0.XX (cyclohexane:ethyl acetate).' },
    ],
  },
  {
    name: 'residue-dissolved',
    ops: [
      { insert: 'The crude residue was dissolved in a small amount of SOLVENT and was purified ' },
      {
        attributes: { italic: true },
        insert: 'via',
      },
      { insert: ' column chromatography (cyclohexane:ethyl acetate; xx:xx → cyclohexane:ethyl acetate; xx:xx). The target compound was isolated as a colorless STATE in xx% yield (xx mg, xx mmol). R' },
      {
        attributes: {
          italic: true,
          script: 'sub',
        },
        insert: 'f = ',
      },
      { insert: '0.XX (cyclohexane:ethyl acetate).' },
    ],
  },
];

const ops1HHead = (freqStr = '', solvent = '') => (
  [
    { attributes: { script: 'super' }, insert: '1' },
    { insert: `H NMR (${freqStr}${solvent}ppm) δ = ` },
  ]
);

const ops13CHead = (freqStr = '', solvent = '') => (
  [
    { attributes: { script: 'super' }, insert: '13' },
    { insert: `C NMR (${freqStr}${solvent}ppm) δ = ` },
  ]
);

const ops19FHead = (freqStr = '', solvent = '') => (
  [
    { attributes: { script: 'super' }, insert: '19' },
    { insert: `F NMR (${freqStr}${solvent}ppm) δ = ` },
  ]
);

const opsCommonTail = () => (
  [
    { insert: '. ' },
  ]
);

const opsIRHead = () => (
  [
    { insert: 'IR (ATR, ṽ) = ' },
  ]
);

const opsIRTail = () => (
  [
    { insert: ' cm' },
    { attributes: { script: 'super' }, insert: '–1' },
    { insert: '. ' },
  ]
);

const opsRAMANHead = () => (
  [
    { insert: 'RAMAN (ṽ) = ' },
  ]
);

const opsRAMANTail = () => (
  [
    { insert: ' cm' },
    { attributes: { script: 'super' }, insert: '–1' },
    { insert: '. ' },
  ]
);

const sampleAnalysesContentSymbol = [
  {
    name: 'ndash',
    render: minusRender,
    ops: [
      { insert: '–' },
    ],
  },
  {
    name: 'h-nmr',
    ops: ops1HHead([]),
  },
  {
    name: 'c-nmr',
    ops: ops13CHead([]),
  },
  {
    name: 'ir',
    ops: [...opsIRHead(), ...opsIRTail()],
  },
  {
    name: 'uv',
    ops: [
      { insert: 'UV-VIS (CH' },
      { attributes: { script: 'sub' }, insert: '2' },
      { insert: 'Cl' },
      { attributes: { script: 'sub' }, insert: '2' },
      { insert: '), λ' },
      { attributes: { script: 'sub' }, insert: 'max' },
      { insert: '(log ε) = .' },
    ],
  },
  {
    name: 'ea',
    ops: [
      { insert: 'EA (): Calcd C ; H ; N ; O . Found C ; H ; N ; O .' },
    ],
  },
];

const opsMSHead = (solventOps = []) => ( // eslint-disable-line
  []
);

const opsMSTail = () => (
  []
);

const SpectraOps = {
  PLAIN: { head: [], tail: [] },
  '1H': { head: ops1HHead, tail: opsCommonTail },
  '13C': { head: ops13CHead, tail: opsCommonTail },
  '19F': { head: ops19FHead, tail: opsCommonTail },
  IR: { head: opsIRHead, tail: opsIRTail },
  RAMAN: { head: opsRAMANHead, tail: opsRAMANTail },
  MS: { head: opsMSHead, tail: opsMSTail },
};

const sampleAnalysesContentDropdown = [
  {
    name: 'ei',
    ops: [
      { insert: 'MS (EI, 70 eV, XX °C), m/z (%):' },
    ],
  },
  {
    name: 'fab',
    ops: [
      { insert: 'MS (FAB, 3-NBA), m/z (%):' },
    ],
  },
  {
    name: 'esi',
    ops: [
      { insert: 'MS (ESI), m/z (%):' },
    ],
  },
  {
    name: 'apci',
    ops: [
      { insert: 'MS (APCI, CH' },
      {
        attributes: { script: 'sub' },
        insert: '3',
      },
      { insert: 'COONH' },
      {
        attributes: { script: 'sub' },
        insert: '4',
      },
      { insert: '), m/z (%): ' },
    ],
  },
  {
    name: 'asap',
    ops: [
      { insert: 'MS (ASAP), m/z (%):' },
    ],
  },
  {
    name: 'maldi',
    ops: [
      { insert: 'MS (MALDI-TOF), m/z (%):' },
    ],
  },
  {
    name: 'm+',
    ops: [
      { insert: '[M+]' },
    ],
  },
  {
    name: 'hr',
    ops: [
      { insert: 'HRMS (): calcd , found .' },
    ],
  },
  {
    name: 'hr-ei',
    ops: [
      { insert: 'HRMS–EI ' },
      { insert: '(m/z)', attributes: { italic: true } },
      { insert: ': [M]' },
      { insert: '+', attributes: { script: 'super' } },
      { insert: ' calcd for , ' },
      { insert: 'MASS', attributes: { bold: true } },
      { insert: '; found, ' },
      { insert: 'MASS', attributes: { bold: true } },
      { insert: '.' },
    ],
  },
  {
    name: 'hr-fab',
    ops: [
      { insert: 'HRMS–FAB ' },
      { insert: '(m/z)', attributes: { italic: true } },
      { insert: ': [M + H]' },
      { insert: '+', attributes: { script: 'super' } },
      { insert: ' calcd for , ' },
      { insert: 'MASS', attributes: { bold: true } },
      { insert: '; found, ' },
      { insert: 'MASS', attributes: { bold: true } },
      { insert: '.' },
    ],
  },
];

module.exports = {
  reactionToolbarSymbol, sampleAnalysesContentSymbol, SpectraOps, sampleAnalysesContentDropdown
};

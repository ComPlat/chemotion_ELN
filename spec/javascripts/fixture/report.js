const splSettings = [
  { checked: true, text: 'diagram' },
  { checked: true, text: 'collection' },
  { checked: true, text: 'analyses' },
  { checked: true, text: 'reaction description' },
];

const rxnSettings = [
  { checked: true, text: 'diagram' },
  { checked: true, text: 'material' },
  { checked: true, text: 'description' },
  { checked: true, text: 'purification' },
  { checked: true, text: 'tlc' },
  { checked: true, text: 'observation' },
  { checked: true, text: 'analysis' },
  { checked: true, text: 'literature' },
];

const siRxnSettings = [
  { checked: true, text: 'Name' },
  { checked: true, text: 'CAS' },
  { checked: true, text: 'Formula' },
  { checked: true, text: 'Smiles' },
  { checked: true, text: 'InCHI' },
  { checked: true, text: 'Molecular Mass' },
  { checked: true, text: 'Exact Mass' },
  { checked: true, text: 'EA' },
];

const configs = [
  { text: 'Page Break', checked: true },
  { text: 'Show all chemicals in schemes (unchecked to show products only)', checked: true },
];

const originalState = {
  splSettings,
  rxnSettings,
  siRxnSettings,
  configs,
  checkedAllSplSettings: true,
  checkedAllRxnSettings: true,
  checkedAllSiRxnSettings: true,
  checkedAllConfigs: true,
  processingReport: false,
  defaultObjTags: { sampleIds: [], reactionIds: [] },
  selectedObjTags: { sampleIds: [], reactionIds: [] },
  selectedObjs: [],
  imgFormat: 'png',
  archives: [],
  fileName: 'ELN_report',
  fileDescription: '',
  activeKey: 0,
  processings: [],
  template: 'supporting_information',
  selMolSerials: [],
};

export { originalState, splSettings, rxnSettings, configs };

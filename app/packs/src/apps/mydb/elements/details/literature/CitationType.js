const CitationTypeMap = {
  citedOwn: {
    def: 'cited own work - reference describing exactly this experiment/same authors',
    short: 'cited own work',
    datacite: ['IsCitedBy']
  },
  citedRef: {
    def: 'cited reference - reference describing the experiment done by others',
    short: 'cited reference',
    dataCite: ['Continues']
  },
  referTo: {
    def: 'referring to - reference similar experiments or related literature',
    short: 'referring to',
    dataCite: ['References']
  },
  uncategorized: {
    def: 'uncategorized - no citation type has been set',
    short: 'uncategorized',
    dataCite: []
  }
};

const cellLineCitationTypeMap = {
  literatureOfSource: {
    def: 'Official literature',
    short: 'literature from source',
    datacite: []
  },
  additionalLiterature: {
    def: 'Additional literature',
    short: 'additional literature',
    datacite: []
  }
};
const CitationType = Object.keys(CitationTypeMap).filter((e) => e !== 'uncategorized');
const CitationTypeEOL = ['cited', 'citing', null, ''];

export {
  CitationTypeMap, CitationType, CitationTypeEOL, cellLineCitationTypeMap
};

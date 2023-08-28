import { cellLineCitationTypeMap, CitationTypeMap } from 'src/apps/mydb/elements/details/literature/CitationType';

const getKeysOfMap = (citationMap) => Object.keys(citationMap).filter((e) => e !== 'uncategorized');

const createCitationTypeMap = (type) => (type === 'cell_line' ? cellLineCitationTypeMap : CitationTypeMap);

export {
  getKeysOfMap,
  createCitationTypeMap
};

import { cellLineCitationTypeMap, CitationTypeMap } from 'src/apps/mydb/elements/details/literature/CitationType';

const getKeysOfMap = (citationMap) => Object.keys(citationMap).filter((e) => e !== 'uncategorized');

const createCitationTypeMap = (type) => (type === 'placeholder' ? cellLineCitationTypeMap : CitationTypeMap);

export {
  getKeysOfMap,
  createCitationTypeMap
};

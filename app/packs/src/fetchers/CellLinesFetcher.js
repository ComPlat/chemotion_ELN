import CellLine from 'src/models/cellLine/CellLine';

export default class CellLinesFetcher {
  static mockData = {};

  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return new Promise((resolve, reject) => {
      const result = {};

      result.elements = CellLinesFetcher.mockData;
      result.page = 1;
      result.pages = 1;
      result.perPage = 15;
      result.totalElements = CellLinesFetcher.mockData.length;
      result;
      resolve(result);
    });
  }

  static fetchById(id) {
    return CellLinesFetcher.fetchByCollectionId(0)
      .then((result) => result.elements[Number(id) - 1]);
  }

  static update(cellLineItem) {
    var index = CellLinesFetcher.mockData.findIndex((cellLine) => cellLineItem.id === cellLine.id);
    if(index===-1){
      index=CellLinesFetcher.mockData.length;
    }
    cellLineItem.id=(index+1).toString();
    CellLinesFetcher.mockData[index] = cellLineItem;
    
    return CellLinesFetcher.fetchById(index + 1);
  }

  static {
    const c1 = CellLine.buildEmpty(0,'FYA-C1');
    c1.cellLineName = 'Cell line 123';
    c1.cellLineId = 1;
    c1.id = '1';
    // ----- Material
    c1.organism = 'Mensch';
    c1.tissue = 'Lunge';
    c1.cellType = 'primary cells';
    c1.mutation = 'none';
    c1.disease = 'lung cancer';
    c1.bioSafetyLevel = 'S1';
    c1.variant = 'S1';
    c1.optimalGrowthTemperature = 36;
    c1.cryopreservationMedium = 'unknown';
    c1.name = '10-15';
    c1.materialComment = '';
    // ----- Item
    c1.amount = 1000;
    c1.passage = 10;
    c1.contamination = 'none';
    c1.source = 'IPB';
    c1.growthMedium = 'unknown';
    c1.itemComment = '';
    c1.itemName = 'CellLine 001-001';

    const c2 = CellLine.buildEmpty(0,'FYA-C2');
    c2.cellLineName = 'Cell line 123';
    c2.cellLineId = 1;
    c2.id = '2';
    c2.organism = 'Mensch';
    c2.tissue = 'Lunge';
    c2.cellType = 'primary cells';
    c2.mutation = 'none';
    c2.disease = 'lung cancer';
    c2.bioSafetyLevel = 'S1';
    c2.variant = 'S1';
    c2.optimalGrowthTemperature = 36;
    c2.cryopreservationMedium = 'unknown';
    c2.name = '10-15';
    c2.materialComment = '';
    // ----- Item
    c2.amount = 20000;
    c2.passage = 11;
    c2.contamination = 'something';
    c2.source = 'IPB';
    c2.growthMedium = 'unknown';
    c2.itemComment = 'Cellline is contamined!!!';
    c2.itemName = 'CellLine 001-002';

    const c3 = CellLine.buildEmpty(0,'FYA-C3');
    c3.cellLineName = 'Cell line 123';
    c3.cellLineId = 1;
    c3.id = '3';
    c3.organism = 'Mensch';
    c3.tissue = 'Lunge';
    c3.cellType = 'primary cells';
    c3.mutation = 'none';
    c3.disease = 'lung cancer';
    c3.bioSafetyLevel = 'S1';
    c3.variant = 'S1';
    c3.optimalGrowthTemperature = 36;
    c3.cryopreservationMedium = 'unknown';
    c3.name = '10-15';
    c3.materialComment = '';
    // ----- Item
    c3.amount = 40000;
    c3.passage = 10;
    c3.contamination = 'none';
    c3.source = 'IPB';
    c3.growthMedium = 'unknown';
    c3.itemComment = '';
    c3.itemName = 'CellLine 001-003';

    const c4 = CellLine.buildEmpty(0,'FYA-C4');
    c4.cellLineName = 'Cell line 456';
    c4.cellLineId = 2;
    c4.id = '4';
    c4.organism = 'Mouse';
    c4.tissue = 'colon';
    c4.cellType = 'primary cells';
    c4.mutation = 'none';
    c4.disease = 'colon cancer';
    c4.bioSafetyLevel = 'S1';
    c4.variant = 'S1';
    c4.optimalGrowthTemperature = 36;
    c4.cryopreservationMedium = 'unknown';
    c4.name = 'Mouse';
    c4.materialComment = '';
    c4.itemName = 'CellLine 002-001';
    // ----- Item
    c4.amount = 10000;
    c4.passage = 10;
    c4.contamination = 'none';
    c4.source = 'IPB';
    c4.growthMedium = 'unknown';
    c4.itemComment = '';

    const c5 = CellLine.buildEmpty(0,'FYA-C5');
    c5.cellLineName = 'Cell line 456';
    c5.cellLineId = 2;
    c5.id = '5';
    c5.organism = 'Mouse';
    c5.tissue = 'colon';
    c5.cellType = 'primary cells';
    c5.mutation = 'none';
    c5.disease = 'colon cancer';
    c5.bioSafetyLevel = 'S1';
    c5.variant = 'S1';
    c5.optimalGrowthTemperature = 36;
    c5.cryopreservationMedium = 'unknown';
    c5.name = '10-15';
    c5.materialComment = '';
    // ----- Item
    c5.amount = 10000;
    c5.passage = 10;
    c5.contamination = 'none';
    c5.source = 'IPB';
    c5.growthMedium = 'unknown';
    c5.itemComment = '';
    c5.itemName = 'CellLine 002-002';

    CellLinesFetcher.mockData = [c1, c2, c3, c4, c5];
  }
}

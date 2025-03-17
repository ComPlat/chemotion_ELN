import { factory } from '@eflexsystems/factory-bot';
import CellLine from '@src/models/cellLine/CellLine';

export default class CellLineFactory {
  static instance = undefined;

  static build(...args) {
    if (CellLineFactory.instance === undefined) {
      CellLineFactory.instance = new CellLineFactory();
    }
    return this.instance.factory.build(...args);
  }

  constructor() {
    this.factory = factory;

    this.factory.define('CellLineFactory.new', CellLine, async () => {
      const cellLine = CellLine.buildEmpty(0, '');
      return cellLine;
    });

    this.factory.define('CellLineFactory.with_name', CellLine, async () => {
      const cellLine = CellLine.buildEmpty(0, '');
      cellLine.cellLineName = 'Cell line 123';
      cellLine.cellLineId = 1;
      return cellLine;
    });

    this.factory.define('CellLineFactory.with_other_name', CellLine, async () => {
      const cellLine = CellLine.buildEmpty(0, '');
      cellLine.cellLineName = 'Cell line 456';
      cellLine.cellLineId = 2;
      return cellLine;
    });
    this.factory.define('CellLineFactory.heLa', CellLine, async () => {
      const cellLine = CellLine.buildEmpty(0, '');
      cellLine.cellLineName = 'HeLa';
      cellLine.cellLineId = 2;
      cellLine.id = 1;
      cellLine.organism = 'Human';
      cellLine.tissue = 'Cervix';
      cellLine.cellType = 'Epithelium';
      cellLine.mutation = 'None';
      cellLine.disease = 'cervical cancer';
      cellLine.bioSafetyLevel = 'S1';
      cellLine.variant = '';
      cellLine.optimal_growth_temp = 36;
      cellLine.cryopreservationMedium = 'DMSO Serum free media, contains 8.7% DMSO in MEM supplemented with methyl cellulose';
      cellLine.materialDescription = 'Test data for cell line material';
      cellLine.gender = 'female';
      cellLine.amount = 1_000_000;
      cellLine.passage = 1;
      cellLine.contamination = 'Myococci';
      cellLine.source = 'The Random Company';
      cellLine.growthMedium = 'DMEM (High Glucose) + 10% FBS';
      cellLine.itemComment = 'Test data for cell line sample';
      cellLine.short_label = 'SHA-001';
      cellLine.itemName = 'Probe DX3-751';
      return cellLine;
    });
  }
}

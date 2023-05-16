import { factory } from 'factory-bot';
import CellLine from 'src/models/cellLine/CellLine';

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

    this.factory.define('new', CellLine, async () => {
      const cellLine = CellLine.buildEmpty(0,'');
      return cellLine;
    });

    this.factory.define('with_name', CellLine, async () => {
      const cellLine = CellLine.buildEmpty(0,'');
      cellLine.cellLineName = 'Cell line 123';
      cellLine.cellLineId = 1;
      return cellLine;
    });

    this.factory.define('with_other_name', CellLine, async () => {
      const cellLine = CellLine.buildEmpty(0,'');
      cellLine.cellLineName = 'Cell line 456';
      cellLine.cellLineId = 2;
      return cellLine;
    });
  }
}

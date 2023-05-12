import Element from 'src/models/Element';
import Container from 'src/models/Container.js';

export default class CellLine extends Element {
  static buildEmpty(collection_id) {
    if (collection_id === undefined || !Number.isInteger(Number(collection_id))) {
      throw new Error(`collection id is not valid: ${collection_id}`);
    }
    const cellLine = new CellLine({
      container: Container.init(),
      collectionId: Number(collection_id),
      type: 'cell_line'
    });

    return cellLine;
  }

  title() {
    return this.itemName;
  }

  adoptPropsFromMobXModel(mobx) {
    this.amount = mobx.amount;
    this.passage = mobx.passage;
    this.contamination = mobx.contamination;
    this.source = mobx.source;
    this.growthMedium = mobx.growthMedium;
    this.itemComment = mobx.itemComment;
    this.itemName = mobx.itemName;

    this.cellLineName = mobx.cellLineName;
    this.mutation = mobx.mutation;
    this.disease = mobx.disease;
    this.organism = mobx.organism;
    this.tissue = mobx.tissue;
    this.variant = mobx.variant;
    this.bioSafetyLevel = mobx.bioSafetyLevel;
    this.cryopreservationMedium = mobx.cryopreservationMedium;
  }
}

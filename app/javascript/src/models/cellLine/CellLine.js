import Element from 'src/models/Element';
import Container from 'src/models/Container';

export default class CellLine extends Element {
  static buildEmpty(collectionId, shortLabelIn) {
    if (collectionId === undefined || !Number.isInteger(Number(collectionId))) {
      throw new Error(`collection id is not valid: ${collectionId}`);
    }
    const cellLine = new CellLine({
      container: Container.init(),
      collectionId: Number(collectionId),
      type: 'cell_line',
      short_label: shortLabelIn
    });

    return cellLine;
  }

  title() {
    return this.short_label;
  }

  static createFromRestResponse(collectionId, response) {
    const cellLine = CellLine.buildEmpty(collectionId, response.short_label);
    cellLine.amount = response.amount;
    cellLine.unit = response.unit;
    cellLine.contamination = response.contamination;
    cellLine.itemComment = response.description;
    cellLine.itemName = response.name;
    cellLine.passage = response.passage;
    cellLine.id = String(response.id);
    cellLine.tag = response.tag;
    cellLine.can_copy = response.can_copy;

    cellLine.cellLineName = response.cellline_material.name;
    cellLine.source = response.cellline_material.source;
    cellLine.growthMedium = response.cellline_material.growth_medium;
    cellLine.mutation = response.cellline_material.mutation;
    cellLine.gender = response.cellline_material.gender;
    cellLine.disease = response.cellline_material.disease;
    cellLine.organism = response.cellline_material.organism;
    cellLine.tissue = response.cellline_material.tissue;
    cellLine.variant = response.cellline_material.variant;
    cellLine.optimal_growth_temp = response.cellline_material.optimal_growth_temp;
    cellLine.materialDescription = response.cellline_material.description;
    cellLine.cellType = response.cellline_material.cell_type;
    cellLine.bioSafetyLevel = response.cellline_material.biosafety_level;
    cellLine.cryopreservationMedium = response.cellline_material.cryo_pres_medium;
    cellLine.created_by = response.cellline_material.created_by;
    cellLine.is_new = false;

    cellLine.container = response.container;

    return cellLine;
  }

  copyMaterialFrom(cellLineItem) {
    this.organism = cellLineItem.organism;
    this.tissue = cellLineItem.tissue;
    this.disease = cellLineItem.disease;
    this.growthMedium = cellLineItem.growthMedium;
    this.cellLineName = cellLineItem.cellLineName;
    this.cellType = cellLineItem.cellType;
    this.mutation = cellLineItem.mutation;
    this.bioSafetyLevel = cellLineItem.bioSafetyLevel;
    this.variant = cellLineItem.variant;
    this.optimal_growth_temp = cellLineItem.optimal_growth_temp;
    this.cryopreservationMedium = cellLineItem.cryopreservationMedium;
    this.gender = cellLineItem.gender;
    this.materialDescription = cellLineItem.materialDescription;
    this.source = cellLineItem.source;
    this.created_by = cellLineItem.created_by;
  }

  adoptPropsFromMobXModel(mobx) {
    this.amount = mobx.amount;
    this.passage = mobx.passage;
    this.contamination = mobx.contamination;
    this.source = mobx.source;
    this.growthMedium = mobx.growthMedium;
    this.itemDescription = mobx.itemDescription;
    this.materialDescription = mobx.materialDescription;
    this.itemName = mobx.itemName;
    this.gender = mobx.gender;
    this.optimal_growth_temp = mobx.optimalGrowthTemperature;
    this.unit = mobx.unit;

    this.cellLineName = mobx.cellLineName;
    this.mutation = mobx.mutation;
    this.disease = mobx.disease;
    this.organism = mobx.organism;
    this.tissue = mobx.tissue;
    this.variant = mobx.variant;
    this.bioSafetyLevel = mobx.bioSafetyLevel;
    this.cellType = mobx.cellType;
    this.cryopreservationMedium = mobx.cryopreservationMedium;
    this.created_by = mobx.created_by;
  }
}

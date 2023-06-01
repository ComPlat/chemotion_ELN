import Element from 'src/models/Element';
import Container from 'src/models/Container.js';

export default class CellLine extends Element {
 

  static buildEmpty(collection_id,shortLabelIn) {
    if (collection_id === undefined || !Number.isInteger(Number(collection_id))) {
      throw new Error(`collection id is not valid: ${collection_id}`);
    }  
    const cellLine = new CellLine({
      container: Container.init(),
      collectionId: Number(collection_id),
      type: 'cell_line',
      short_label:shortLabelIn
    });

    return cellLine;
  }

  title() {
    return this.itemName;
  }

  static createFromRestResponse(collectionId,response){
    const cellLine = CellLine.buildEmpty(collectionId,response.short_label);
    cellLine.amount=response.amount;
    cellLine.contamination=response.contamination;
    cellLine.source=response.source;
    cellLine.growthMedium=response.growth_medium;
    cellLine.itemComment=response.description;
    cellLine.itemName=response.name;
    cellLine.id=response.id;

    cellLine.cellLineName=response.cellline_material.names[0];
    cellLine.mutation=response.cellline_material.mutation;
    cellLine.disease=response.cellline_material.disease;
    cellLine.organism=response.cellline_material.organism;
    cellLine.tissue=response.cellline_material.tissue;
    cellLine.variant=response.cellline_material.variant;
    cellLine.type=response.cellline_material.cell_type
    cellLine.bioSafetyLevel=response.cellline_material.biosafety_level;
    cellLine.cryopreservationMedium=response.cellline_material.cryo_pres_medium;

    

    return cellLine;
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

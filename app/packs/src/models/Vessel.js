import Element from 'src/models/Element';

export default class Vessel extends Element {
  static buildEmpty(collection_id){
    if (collection_id === undefined || !Number.isInteger(Number(collection_id))) {
        throw new Error(`collection id is not valid: ${collection_id}`);
    }
    const vessel = new Vessel({
      collectionId:Number(collection_id),
      type: 'vessel'
    });
    return vessel;
  }

  title() {
    return this.vesselName;
  }

  adoptPropsFromMobxModel(mobx) {
    this.vesselTemplateName = mobx.vesselTemplateName;
    this.vesselTemplateDetails = mobx.vesselTemplateDetails;
    this.vesselType = mobx.vesselType;
    this.volumeUnit = mobx.volumeUnit;
    this.volumeAmount = mobx.volumeAmount;
    this.materialType = mobx.materialType;
    this.materialDetails = mobx.materialDetails;
    
    this.vesselName = mobx.vesselName;
    this.vesselDescription = mobx.vesselDescription;
  }
}
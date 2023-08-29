import Element from 'src/models/Element';

export default class Vessel extends Element {
  static buildEmpty(collection_id, shortlabel){
    if (collection_id === undefined || !Number.isInteger(Number(collection_id))) {
        throw new Error(`collection id is not valid: ${collection_id}`);
    }
    const vessel = new Vessel({
      collectionId:Number(collection_id),
      type: 'vessel',
      short_label: shortlabel
    });
    return vessel;
  }

  title() {
    return this.short_label;
  }

  static createFromRestResponse(collection_id, response){
    const vessel = Vessel.buildEmpty(collection_id, response.short_label);
    vessel.id = String(response.id);
    vessel.vesselName=response.name;
    vessel.vesselDescription=response.description;

    vessel.vesselTemplateName=response.vessel_template.name;
    vessel.vesselType=response.vessel_template.vessel_type;
    vessel.vesselDetails=response.vessel_template.details;
    vessel.volumeAmount=response.vessel_template.volume_amount;
    vessel.volumeUnit=response.vessel_template.volume_unit;
    vessel.materialType=response.vessel_template.material_type;
    vessel.materialDetails=response.vessel_template.material_details;

    vessel.is_new = false;
    
    return vessel;
  }

  copyMaterialFrom(vesselItem) {
    this.vesselTemplateName = vesselItem.vesselTemplateName;
    this.vesselDetails = vesselItem.vesselDetails;
    this.vesselType = vesselItem.vesselType;
    this.volumeUnit = vesselItem.volumeUnit;
    this.volumeAmount = vesselItem.volumeAmount;
    this.materialType = vesselItem.materialType;
    this.materialDetails = vesselItem.materialDetails;
  }

  adoptPropsFromMobxModel(mobx) {
    this.vesselTemplateName = mobx.vesselTemplateName;
    this.vesselDetails = mobx.vesselDetails;
    this.vesselType = mobx.vesselType;
    this.volumeUnit = mobx.volumeUnit;
    this.volumeAmount = mobx.volumeAmount;
    this.materialType = mobx.materialType;
    this.materialDetails = mobx.materialDetails;
    
    this.vesselName = mobx.vesselName;
    this.vesselDescription = mobx.vesselDescription;
  }
}
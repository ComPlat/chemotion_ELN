import Element from 'src/models/Element';
import Container from 'src/models/Container';

export default class Vessel extends Element {
  static buildEmpty(collectionId, shortLabelIn) {
    if (collectionId === undefined || !Number.isInteger(Number(collectionId))) {
      throw new Error(`collection id is not valid: ${collectionId}`);
    }
    const Vessel = new Vessel({
      container: Container.init(),
      collectionId: Number(collectionId),
      type: 'vessel',
      short_label: shortLabelIn
    });

    return Vessel;
  }

  title() {
    return this.short_label;
  }

  static createFromRestResponse(collectionId, response) {
    const vessel = Vessel.buildEmpty(collectionId, response.short_label);
    vessel.vesselInstanceName = response.name;
    vessel.vesselInstanceDescription = response.description;
    vessel.barCode = response.bar_code;
    vessel.qrCode = response.qr_code;
    vessel.id = response.id;
    // Vessel.tag = response.tag;

    vessel.vesselName = response.vessel_template.name;
    vessel.materialDetails = response.vessel_template.material_details;
    vessel.materialType = response.vessel_template.material_type;
    vessel.vesselType = response.vessel_template.vessel_type;
    vessel.volumeAmount = response.vessel_template.volume_amount;
    vessel.volumeUnit = response.vessel_template.volume_unit;
    vessel.weight = response.vessel_template.weight_amount;
    vessel.weightUnit = response.vessel_template.weight_unit;
    vessel.details = response.vessel_template.details;
    vessel.is_new = false;

    Vessel.container = response.container;

    return vessel;
  }

  copyMaterialFrom(VesselItem) {
    this.vesselName = VesselItem.vesselName;
    this.materialDetails = VesselItem.materialDetails;
    this.materialType = VesselItem.materialType;
    this.vesselType = VesselItem.vesselType;
    this.volumeAmount = VesselItem.volumeAmount;
    this.volumeUnit = VesselItem.volumeUnit;
    this.weight = VesselItem.weight;
    this.weightUnit = VesselItem.weightUnit;
    this.details = VesselItem.details;
  }

  adoptPropsFromMobXModel(mobx) {
    this.name = mobx.VesselName;
    this.details = mobx.itemDescription;
    this.materialDetails = mobx.materialDescription;
    this.materialType = mobx.materialType;
    this.vesselType = mobx.vesselType;
    this.volumeAmount = mobx.volumeAmount;
    this.volumeUnit = mobx.volumeUnit;
    this.weightAmount = mobx.weightAmount;
    this.weightUnit = mobx.weightUnit;
    this.vesselInstanceName = mobx.vesselInstanceName;
    this.vesselInstanceDescription = mobx.vesselInstanceDescription;
    this.qrCode = mobx.qrCode;
    this.barCode = mobx.barCode;
  }
}

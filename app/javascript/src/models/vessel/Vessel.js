import Element from 'src/models/Element';
import Container from 'src/models/Container';

export default class Vessel extends Element {
  static buildEmpty(collectionId, shortLabelIn = '', typeIn = '') {
    if (!Number.isInteger(Number(collectionId))) {
      throw new Error(`collection id is not valid: ${collectionId}`);
    }

    return new Vessel({
      container: Container.init(),
      collectionId: Number(collectionId),
      type: typeIn === 'vessel_template' ? 'vessel_template' : 'vessel',
      short_label: shortLabelIn,
      is_new: true,
    });
  }

  title() {
    return this.type === 'vessel_template' ? this.vesselName : this.short_label;
  }

  static createFromRestResponse(collectionId, response) {
    const vessel = Vessel.buildEmpty(collectionId, response.short_label);
    vessel.vesselInstanceName = response.name || '';
    vessel.vesselInstanceDescription = response.description || '';
    vessel.barCode = response.bar_code;
    vessel.qrCode = response.qr_code;
    vessel.id = response.id || '';
    vessel.weightAmount = response?.weight_amount || 0;
    vessel.weightUnit = response?.weight_unit || '';
    vessel.tag = response.tag;

    vessel.vesselTemplateId = response?.vessel_template?.id || '';
    vessel.vesselName = response?.vessel_template?.name || '';
    vessel.materialDetails = response?.vessel_template?.material_details || '';
    vessel.materialType = response?.vessel_template?.material_type || '';
    vessel.vesselType = response?.vessel_template?.vessel_type || '';
    vessel.volumeAmount = response?.vessel_template?.volume_amount || 0;
    vessel.volumeUnit = response?.vessel_template?.volume_unit || '';
    vessel.details = response?.vessel_template?.details || '';
    vessel.is_new = response?.is_new || false;
    vessel.instances = response.is_new ? response.instances || [] : [];

    vessel.container = response.vessel_template?.container || { children: [] };
    if (!Array.isArray(vessel.container.children)) {
      vessel.container.children = [];
    }

    return vessel;
  }

  static createFromTemplateResponse(collectionId, response) {
    const { vessel_template: template, vessels = [] } = response;

    const result = [];

    // Create the template item
    const templateItem = Vessel.buildEmpty(collectionId, '', 'vessel_template');
    templateItem.id = template.id;
    templateItem.vesselTemplateId = template.id;
    templateItem.vesselName = template.name || '';
    templateItem.details = template.details || '';
    templateItem.materialDetails = template.material_details || '';
    templateItem.materialType = template.material_type || '';
    templateItem.vesselType = template.vessel_type || '';
    templateItem.volumeAmount = template.volume_amount || 0;
    templateItem.volumeUnit = template.volume_unit || '';
    templateItem.is_new = false;
    templateItem.container = template.container || { children: [] };
    if (!Array.isArray(templateItem.container.children)) {
      templateItem.container.children = [];
    }

    result.push(templateItem);

    // Create vessel instance items
    vessels.forEach((instance) => {
      const vessel = Vessel.buildEmpty(collectionId, instance.short_label || '', 'vessel');
      vessel.id = instance.id;
      vessel.vesselInstanceName = instance.name || '';
      vessel.vesselInstanceDescription = instance.description || '';
      vessel.barCode = instance.bar_code || '';
      vessel.qrCode = instance.qr_code || '';
      vessel.weightAmount = instance.weight_amount || 0;
      vessel.weightUnit = instance.weight_unit || '';
      vessel.tag = instance.tag;

      vessel.vesselTemplateId = template.id;
      vessel.vesselName = template.name || '';
      vessel.details = instance.details || template.details || '';
      vessel.materialDetails = instance.material_details || template.material_details || '';
      vessel.materialType = instance.material_type || template.material_type || '';
      vessel.vesselType = instance.vessel_type || template.vessel_type || '';
      vessel.volumeAmount = instance.volume_amount || template.volume_amount || 0;
      vessel.volumeUnit = instance.volume_unit || template.volume_unit || '';
      vessel.is_new = false;
      vessel.container = instance.container || { children: [] };

      if (!Array.isArray(vessel.container.children)) {
        vessel.container.children = [];
      }

      result.push(vessel);
    });

    return result;
  }

  static createFromTemplateObject(collectionId, templateObj) {
    const vessel = Vessel.buildEmpty(collectionId, '', 'vessel_template');

    vessel.vesselTemplateId = templateObj.id;
    vessel.vesselName = templateObj.name || '';
    vessel.details = templateObj.details || '';
    vessel.materialDetails = templateObj.material_details || '';
    vessel.materialType = templateObj.material_type || '';
    vessel.vesselType = templateObj.vessel_type || '';
    vessel.volumeAmount = templateObj.volume_amount || 0;
    vessel.volumeUnit = templateObj.volume_unit || '';
    vessel.is_new = false;

    return vessel;
  }

  copyMaterialFrom(VesselItem) {
    this.details = VesselItem.details;
    this.materialDetails = VesselItem.materialDetails;
    this.materialType = VesselItem.materialType;
    this.vesselType = VesselItem.vesselType;
    this.volumeAmount = VesselItem.volumeAmount;
    this.volumeUnit = VesselItem.volumeUnit;
  }

  adoptPropsFromMobXModel(mobx) {
    this.vesselName = mobx.vesselName;
    this.vesselTemplateId = mobx.vesselTemplateId;
    this.details = mobx.details;
    this.materialDetails = mobx.materialDetails;
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
    this.instances = mobx.instances.map((instance) => ({ ...instance }));
  }
}

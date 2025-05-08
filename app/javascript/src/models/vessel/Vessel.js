import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class Vessel extends Element {
  static buildEmpty(collectionId, shortLabelIn = '', typeIn = '') {
    if (collectionId === undefined || !Number.isInteger(Number(collectionId))) {
      throw new Error(`collection id is not valid: ${collectionId}`);
    }

    const shortLabel = shortLabelIn || Vessel.buildNewShortLabel();

    const vessel = new Vessel({
      container: Container.init(),
      collectionId: Number(collectionId),
      type: typeIn === 'vessel_template' ? 'vessel_template' : 'vessel',
      short_label: shortLabel,
      is_new: true,
    });

    return vessel;
  }

  static buildNewShortLabel() {
    const { currentUser } = UserStore.getState();
    if (!currentUser) return 'NEW VESSEL';
    return `${currentUser.initials}-V${currentUser.vessels_count + 1}`;
  }

  title() {
    if (this.type === 'vessel_template') {
      return this.vesselName;
    }
    return this.short_label;
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

    vessel.container = response.container || { children: [] };
    if (!Array.isArray(vessel.container.children)) {
      vessel.container.children = [];
    }

    return vessel;
  }

  static createFromTemplateResponse(collectionId, vesselData) {
    return vesselData.vessels.map((vesselInstance) => {
      const vessel = Vessel.buildEmpty(collectionId, vesselInstance.short_label, 'vessel_template');

      vessel.id = vesselInstance.id;
      vessel.vesselInstanceName = vesselInstance.name || '';
      vessel.vesselInstanceDescription = vesselInstance.description || '';
      vessel.barCode = vesselInstance.bar_code || '';
      vessel.qrCode = vesselInstance.qr_code || '';
      vessel.weightAmount = vesselInstance.weight_amount || 0;
      vessel.weightUnit = vesselInstance.weight_unit || '';
      vessel.tag = vesselInstance.tag;

      vessel.vesselTemplateId = vesselInstance.vessel_template.id || '';
      vessel.vesselName = vesselInstance.vessel_template.name || '';
      vessel.details = vesselInstance.vessel_template.details || '';
      vessel.materialDetails = vesselInstance.vessel_template.material_details || '';
      vessel.materialType = vesselInstance.vessel_template.material_type || '';
      vessel.vesselType = vesselInstance.vessel_template.vessel_type || '';
      vessel.volumeAmount = vesselInstance.vessel_template.volume_amount || 0;
      vessel.volumeUnit = vesselInstance.vessel_template.volume_unit || '';
      vessel.is_new = vesselInstance?.is_new || false;

      vessel.container = vesselInstance.container || { children: [] };

      if (!Array.isArray(vessel.container.children)) {
        vessel.container.children = [];
      }

      return vessel;
    });

  }

  copyMaterialFrom(VesselItem) {
    this.vesselName = VesselItem.vesselName;
    this.materialDetails = VesselItem.materialDetails;
    this.materialType = VesselItem.materialType;
    this.vesselType = VesselItem.vesselType;
    this.volumeAmount = VesselItem.volumeAmount;
    this.volumeUnit = VesselItem.volumeUnit;
    this.details = VesselItem.details;
  }

  adoptPropsFromMobXModel(mobx) {
    this.vesselName = mobx.vesselName;
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

import { types } from 'mobx-state-tree';

const VesselItem = types.model({
  vesselTemplateId: 1,
  vesselTemplateName: '',
  vesselDetails: '',
  vesselType: '',
  volumeUnit: '',
  volumeAmount: 0,
  materialType: '',
  materialDetails: '',
  id: '',
  vesselName: '',
  vesselDescription: '',
  shortLabel: '',
  changed: false,
}).actions((self) => ({
  setChanged(newChanged) {
    self.changed = newChanged;
  }
}));

export const VesselDetailsStore = types.model({
  vesselItem: types.map(VesselItem)
}).actions((self)=> ({
  changeTemplateName(id, newVesselTemplateName) {
    self.vesselItem.get(id).changed = true;
    self.vesselItem.get(id).vesselTemplateName = newVesselTemplateName;
  },
  changeDetails(id, newVesselDetails) {
    self.vesselItem.get(id).changed = true;
    self.vesselItem.get(id).vesselDetails = newVesselDetails;
  },
  changeType(id, newVesselType) {
    self.vesselItem.get(id).changed = true;
    self.vesselItem.get(id).vesselType = newVesselType;
  },
  changeVolumeUnit(id, newVolumeUnit) {
    self.vesselItem.get(id).changed = true;
    self.vesselItem.get(id).volumeUnit = newVolumeUnit;
  },
  changeVolumeAmount(id, newVolumeAmount) {
    self.vesselItem.get(id).changed = true;
    self.vesselItem.get(id).volumeAmount = Number(newVolumeAmount);
  },
  changeMaterialType(id, newMaterialType) {
    self.vesselItem.get(id).changed = true;
    self.vesselItem.get(id).materialType = newMaterialType;
  },
  changeMaterialDetails(id, newMaterialDetails) {
    self.vesselItem.get(id).changed = true;
    self.vesselItem.get(id).materialDetails = newMaterialDetails;
  },
  changeName(id, newVesselName) {
    self.vesselItem.get(id).changed = true;
    self.vesselItem.get(id).vesselName = newVesselName;
  },
  changeDescription(id, newVesselDescription) {
    self.vesselItem.get(id).changed = true;
    self.vesselItem.get(id).vesselDescription = newVesselDescription;
  },
  removeVesselFromStore(id) {
    self.vesselItem.delete(id);
  },
  convertVesselToModel(jsVesselModel) {
    if (self.vesselItem.has(jsVesselModel.id)) {
      return;
    }
    self.vesselItem.set(jsVesselModel.id, VesselItem.create({
      vesselTemplateId: jsVesselModel.vesselTemplateId,
      vesselTemplateName: jsVesselModel.vesselTemplateName,
      vesselDetails: jsVesselModel.vesselDetails,
      vesselType: jsVesselModel.vesselType,
      volumeUnit: jsVesselModel.volumeUnit,
      volumeAmount: jsVesselModel.volumeAmount,
      materialType: jsVesselModel.materialType,
      materialDetails: jsVesselModel.materialDetails,
      id: jsVesselModel.id.toString(),
      vesselName: jsVesselModel.vesselName,
      vesselDescription: jsVesselModel.vesselDescription,
      shortLabel: jsVesselModel.short_label
    }))
  }
})).views((self) => ({
  vessels(id) {
    return self.vesselItem.get(id);
  }
}));
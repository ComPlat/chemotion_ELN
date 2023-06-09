import { types } from 'mobx-state-tree';

const VesselItem = types.model({
  vesselTemplateId: 1,
  vesselTemplateName: '',
  vesselTemplateDetails: '',
  vesselType: '',
  volumeUnit: '',
  volumeAmount: '',
  materialType: '',
  materialDetails: '',
  id: '',
  vesselName: '',
  vesselDescription: '',
})

export const VesselDetailsStore = types.model({
  vesselItem: types.map(VesselItem)
}).actions((self)=> ({
  changeTemplateName(id, newVesselTemplateName) {
    self.vesselItem.get(id).vesselTemplateName = newVesselTemplateName;
  },
  changeTemplateDetails(id, newVesselTemplateDetails) {
    self.vesselItem.get(id).vesselTemplateDetails = newVesselTemplateDetails;
  },
  changeType(id, newVesselType) {
    self.vesselItem.get(id).vesselType = newVesselType;
  },
  changeVolumeUnit(id, newVolumeUnit) {
    self.vesselItem.get(id).volumeUnit = newVolumeUnit;
  },
  changeVolumeAmount(id, newVolumeAmount) {
    self.vesselItem.get(id).volumeAmount = newVolumeAmount;
  },
  changeMaterialType(id, newMaterialType) {
    self.vesselItem.get(id).materialType = newMaterialType;
  },
  changeMaterialDetails(id, newMaterialDetails) {
    self.vesselItem.get(id).materialDetails = newMaterialDetails;
  },
  changeName(id, newVesselName) {
    self.vesselItem.get(id).vesselName = newVesselName;
  },
  changeDescription(id, newVesselDescription) {
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
      vesselTemplateDetails: jsVesselModel.vesselTemplateDetails,
      vesselType: jsVesselModel.vesselType,
      volumeUnit: jsVesselModel.volumeUnit,
      volumeAmount: jsVesselModel.volumeAmount,
      materialType: jsVesselModel.materialType,
      materialDetails: jsVesselModel.materialDetails,
      id: jsVesselModel.id,
      vesselName: jsVesselModel.vesselName,
      vesselDescription: jsVesselModel.vesselDescription,
    }))
  }
})).views((self) => ({
  vessels(id) {
    return self.vesselItem.get(id);
  }
}));
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
  changeNameOfVessel(id, newVesselName) {
    self.vesselItem.get(id).vesselName = newVesselName;
  },
  changeDescriptionOfVessel(id, newVesselDescription) {
    self.vesselItem.get(id).vesselDescription = newVesselDescription;
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
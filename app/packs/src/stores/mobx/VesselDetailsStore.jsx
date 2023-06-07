import { types } from 'mobx-state-tree';

const VesselItem = types.model({
  vesselTemplateId: 1,
  vesselTemplateName: 'test',
  vesselTemplateDetails: '',
  vesselType: '',
  volumeUnit: '',
  volumeAmount: '',
  materialType: '',
  materialDetails: '',
  vesselId: -1,
  vesselName: '',
  vesselDescription: '',
})

export const VesselDetailsStore = types.model({
  vesselItem: types.map(VesselItem)
}).actions((self)=> ({
  convertVesselToModel(jsVesselModel) {
    if (self.vesselItem.has(jsVesselModel.vesselId)) {
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
      vesselId: jsVesselModel.vesselId,
      vesselName: jsVesselModel.vesselName,
      vesselDescription: jsVesselModel.vesselDescription,
    }))
  }
})).views((self) => ({
  vessels(id) {
    return self.vesselItem.get(id);
  }
}));
/* eslint-disable import/prefer-default-export */
import { types } from 'mobx-state-tree';
import Container from 'src/models/Container';

const VesselContainer = types
  .model({
    id: types.optional(types.string, ''),
    children: types.array(types.late(() => VesselContainer)),
    name: types.optional(types.string, ''),
    container_type: types.optional(types.string, ''),
    extended_metadata: types.optional(types.string, ''),
    description: types.optional(types.string, ''),
  })
  .actions((self) => ({
    setDescription(newValue) {
      self.description = newValue;
    },
  }));

const VesselItem = types
  .model({
    id: '',
    vesselName: '',
    details: '',
    materialDetails: '',
    materialType: '',
    vesselType: '',
    volumeAmount: 0,
    volumeUnit: types.string,
    weightAmount: 0,
    weightUnit: types.string,
    vesselInstanceName: '',
    vesselInstanceDescription: '',
    qrCode: '',
    barCode: '',
    shortLabel: types.maybeNull(types.string),
    changed: false
  })
  .actions((self) => ({
    markChanged(newChanged) {
      self.changed = newChanged;
    },
  }));

export const VesselDetailsStore = types
  .model({
    vessels: types.map(VesselItem),
  })
  .actions((self) => ({
    removeVesselFromStore(id) {
      self.vessels.delete(id);
    },
    addEmptyContainer(id) {
      const container = Container.buildEmpty();
      container.container_type = "dataset";
      container.children = container.children || [];
      return container;
    },
    changeVesselName(id, newName) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).vesselName = newName;
    },
    changeDetails(id, newDetails) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).details = newDetails;
    },
    changeMaterialDetails(id, newMaterialDetails) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).materialDetails = newMaterialDetails;
    },
    changeMaterialType(id, newMaterialType) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).materialType = newMaterialType;
    },
    changeVesselType(id, newVesselType) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).vesselType = newVesselType;
    },
    changeVolumeAmount(id, newVolumeAmount) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).volumeAmount = newVolumeAmount;
    },
    changeVolumeUnit(id, newVolumeUnit) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).volumeUnit = newVolumeUnit;
    },
    changeWeightAmount(id, newWeightAmount) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).weightAmount = newWeightAmount;
    },
    changeWeightUnit(id, newWeightUnit) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).weightUnit = newWeightUnit;
    },
    changeVesselInstanceName(id, newInstanceName) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).vesselInstanceName = newInstanceName;
    },
    changeVesselInstanceDescription(id, newDescription) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).vesselInstanceDescription = newDescription;
    },
    changeBarCode(id, newBarCode) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).barCode = newBarCode;
    },
    changeQrCode(id, newQrCode) {
      self.vessels.get(id).changed = true;
      self.vessels.get(id).qrCode = newQrCode;
    },
    convertJsModelToMobxModel(container) {
      return VesselContainer.create({
        id: container.id,
        children: [],
        name: container.name,
        container_type: container.container_type
      });
    },
    convertVesselToModel(jsVesselModel) {
      if (self.vessels.has(jsVesselModel.id)) {
        return;
      }

      self.vessels.set(jsVesselModel.id, VesselItem.create({
        id: jsVesselModel.id || '',
        vesselName: jsVesselModel.vesselName || '',
        details: jsVesselModel.details || '',
        materialDetails: jsVesselModel.materialDetails || '',
        materialType: jsVesselModel.materialType || '',
        vesselType: jsVesselModel.vesselType || '',
        volumeAmount: jsVesselModel.volumeAmount || 0,
        volumeUnit: jsVesselModel.volumeUnit || '',
        weightAmount: jsVesselModel.weightAmount || 0,
        weightUnit: jsVesselModel.weightUnit || '',
        vesselInstanceName: jsVesselModel.vesselInstanceName || '',
        vesselInstanceDescription: jsVesselModel.vesselInstanceDescription || '',
        qrCode: jsVesselModel.qrCode || '',
        barCode: jsVesselModel.barCode || '',
        shortLabel: jsVesselModel.short_label || '',
        is_new: !jsVesselModel.id,
      }));
    },
    setMaterialProperties(id, properties) {
      const item = self.vessels.get(id);
      if (item === undefined) {
        throw new Error(`No vessel with id found: ${id}`);
      }
      item.vesselName = properties.name;
      item.details = properties.details || '';
      item.materialDetails = properties.material_details || '';
      item.materialType = properties.material_type || '';
      item.vesselType = properties.vessel_type || '';
      item.volumeAmount = properties.volume_amount || 0;
      item.volumeUnit = properties.volume_unit || '';
      item.weightAmount = properties.weight_amount || 0;
      item.weightUnit = properties.weight_unit || '';
    }
  }))
  .views((self) => ({
    getVessel(id) {
      return self.vessels.get(id);
    },
  }));

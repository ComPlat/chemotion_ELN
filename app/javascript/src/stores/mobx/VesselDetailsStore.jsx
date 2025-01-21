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
    initializeContainer(vesselId) {
      const vessel = self.vessels.get(vesselId);
      if (!vessel) {
        console.error(`Vessel not found in store for id: ${vesselId}`);
        return;
      }
      if (!vessel.container) {
        vessel.container = { children: [] };
      } else if (!Array.isArray(vessel.container.children)) {
        vessel.container.children = [];
      }
    },
    addContainerToVessel(vesselId) {
      console.log("Adding container to vessel:", vesselId);
      const vessel = self.vessels.get(vesselId);
      if (!vessel) {
        console.error("Vessel not found");
        return;
      }
      const newContainer = self.addEmptyContainer(vesselId);
      vessel.container.children.push(newContainer);
      vessel.markChanged(true);
    },
    updateVesselContainer(vesselId, updatedContainer) {
      const vessel = self.vessels.get(vesselId);
      if (!vessel) {
        console.error("Vessel not found");
        return;
      }
      vessel.container = updatedContainer; 
      vessel.markChanged(true);
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
      //name vs vesselName to be verified
      item.vesselName = properties.vesselName;
      item.details = properties.details || '';
      item.materialDetails = properties.materialDetails || '';
      item.materialType = properties.materialType || '';
      item.vesselType = properties.vesselType || '';
      item.volumeAmount = properties.volumeAmount || 0;
      item.volumeUnit = properties.volumeUnit || '';
      item.weightAmount = properties.weightAmount || 0;
      item.weightUnit = properties.weightUnit || '';
    }
  }))
  .views((self) => ({
    getVessel(id) {
      return self.vessels.get(id);
    },
    checkInputValidity(id) {
      const result = [];
      const item = self.vessels.get(id);
      if (item.name.trim() === '') { result.push('name'); }
      // if (item.source.trim() === '') { result.push('source'); }
      if (item.unit.trim() === '') { result.push('unit'); }
      if (!item.isAmountValid()) { result.push('amount'); }
      // if (!Number.isInteger(item.passage) || item.passage === 0) { result.push('passage'); }
      return result;
    }
  }));

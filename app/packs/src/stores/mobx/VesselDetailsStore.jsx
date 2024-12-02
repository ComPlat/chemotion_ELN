/* eslint-disable import/prefer-default-export */
import { types } from 'mobx-state-tree';

const VesselItem = types
  .model({
    id: '',
    vesselName: '',
    details: '',
    materialDetails: '',
    materialType: '',
    vesselType: '',
    volumeAmount: 0,
    volumeUnit: '',
    weightAmount: 0,
    weightUnit: '',
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
    addVessel(vesselData) {
      self.vessels.set(vesselData.id, VesselItem.create(vesselData));
    },
    removeVesselFromStore(id) {
      self.vessels.delete(id);
    },
    changeName(id, newName) {
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
    convertVesselToModel(jsVesselModel) {
      const vesselId = jsVesselModel.id ? jsVesselModel.id.toString() : `new-${Date.now()}`;
      console.log("Generated Vessel ID:", vesselId); // Debugging
      if (self.vessels.has(jsVesselModel.id)) {
        return;
      }

      self.vessels.set(vesselId, VesselItem.create({
        // cellLineId: jsVesselModel.cellLineId,
        id: vesselId,
        name: jsVesselModel.name || '',
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
      }));
    },
    setMaterialProperties(id, properties) {
      const item = self.vessels.get(id);
      if (item === undefined) {
        throw new Error(`No vessel with id found: ${id}`);
      }
      //name vs vesselName to be verified
      item.vesselName = properties.name;
      item.details = properties.details;
      item.materialDetails = properties.materialDetails;
      item.materialType = properties.materialType;
      item.vesselType = properties.vesselType;
      item.volumeAmount = properties.volumeAmount;
      item.volumeUnit = properties.volumeUnit;
      item.weightAmount = properties.weightAmount;
      item.weightUnit = properties.weightUnit;
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

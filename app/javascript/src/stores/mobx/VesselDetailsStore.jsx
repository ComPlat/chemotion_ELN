import { types } from 'mobx-state-tree';

// Define the VesselItem model to represent individual vessels
const VesselItem = types
  .model({
    id: types.identifier,
    name: '',
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

  })
  .actions((self) => ({
    setName(newName) {
      self.name = newName;
    },
    setDetails(newDetails) {
      self.details = newDetails;
    },
    setMaterialDetails(newMaterialDetails) {
      self.materialDetails = newMaterialDetails;
    },
    setMaterialType(newMaterialType) {
      self.materialType = newMaterialType;
    },
    setVesselType(newVesselType) {
      self.vesselType = newVesselType;
    },
    setVolumeAmount(newVolumeAmount) {
      self.volumeAmount = newVolumeAmount;
    },
    setVolumeUnit(newVolumeUnit) {
      self.volumeUnit = newVolumeUnit;
    },
    setWeightAmount(newWeightAmount) {
      self.weightAmount = newWeightAmount;
    },
    setWeightUnit(newWeightUnit) {
      self.weightUnit = newWeightUnit;
    },
  }));

// Define the VesselDetailsStore to manage collections of vessels
// eslint-disable-next-line import/prefer-default-export
export const VesselDetailsStore = types
  .model({
    vessels: types.map(VesselItem), // Map of VesselItems
  })
  .actions((self) => ({
    addVessel(vesselData) {
      self.vessels.set(vesselData.id, VesselItem.create(vesselData));
    },
    removeVessel(id) {
      self.vessels.delete(id);
    },
    updateVessel(id, updatedData) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        Object.assign(vessel, updatedData); // Use Object.assign to update fields
      }
    },
    convertVesselToModel(vesselData) {
      if (self.vessels.has(vesselData.id)) {
        return; // Avoid adding duplicates
      }

      self.vessels.set(vesselData.id, VesselItem.create(vesselData));
    },
    setMaterialProperties(id, properties) {
      const item = self.vesselItems.get(id);
      if (item === undefined) {
        throw new Error(`No vessel with id found: ${id}`);
      }

      item.setName(properties.name);
      item.setDetails(properties.details);
      item.setMaterialDetails(properties.materialDetails);
      item.setMaterialType(properties.materialType);
      item.setVesselType(properties.vesselType);
      item.setVolumeAmount(properties.volumeAmount);
      item.setVolumeUnit(properties.volumeUnit);
      item.setWeightAmount(properties.weightAmount);
      item.setWeightUnit(properties.weightUnit);
    },
  }))
  .views((self) => ({
    getVessel(id) {
      return self.vessels.get(id);
    },
    getAllVessels() {
      return Array.from(self.vessels.values());
    },
    hasVessel(id) {
      return self.vessels.has(id);
    },
  }));

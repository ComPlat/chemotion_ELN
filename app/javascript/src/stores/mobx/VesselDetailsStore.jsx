/* eslint-disable import/prefer-default-export */
import { types } from 'mobx-state-tree';

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
    changed: false
  })
  .actions((self) => ({
    markChanged(newChanged) {
      self.changed = newChanged;
    },
    setName(newName) {
      self.name = newName;
      self.markChanged();
    },
    setDetails(newDetails) {
      self.details = newDetails;
      self.markChanged();
    },
    setMaterialDetails(newMaterialDetails) {
      self.materialDetails = newMaterialDetails;
      self.markChanged();
    },
    setMaterialType(newMaterialType) {
      self.materialType = newMaterialType;
      self.markChanged();
    },
    setVesselType(newVesselType) {
      self.vesselType = newVesselType;
      self.markChanged();
    },
    setVolumeAmount(newVolumeAmount) {
      self.volumeAmount = newVolumeAmount;
      self.markChanged();
    },
    setVolumeUnit(newVolumeUnit) {
      self.volumeUnit = newVolumeUnit;
      self.markChanged();
    },
    setWeightAmount(newWeightAmount) {
      self.weightAmount = newWeightAmount;
      self.markChanged();
    },
    setWeightUnit(newWeightUnit) {
      self.weightUnit = newWeightUnit;
      self.markChanged();
    },
    setVesselInstanceName(newName) {
      self.vesselInstanceName = newName;
      self.markChanged();
    },
    setVesselInstanceDescription(newDescription) {
      self.vesselInstanceDescription = newDescription;
      self.markChanged();
    }
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
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setName(newName);
      }
    },
    changeDetails(id, newDetails) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setDetails(newDetails);
      }
    },
    changeMaterialDetails(id, newMaterialDetails) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setMaterialDetails(newMaterialDetails);
      }
    },
    changeMaterialType(id, newMaterialType) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setMaterialType(newMaterialType);
      }
    },
    changeVesselType(id, newVesselType) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setVesselType(newVesselType);
      }
    },
    changeVolumeAmount(id, newVolumeAmount) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setVolumeAmount(newVolumeAmount);
      }
    },
    changeVolumeUnit(id, newVolumeUnit) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setVolumeUnit(newVolumeUnit);
      }
    },
    changeWeightAmount(id, newWeightAmount) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setWeightAmount(newWeightAmount);
      }
    },
    changeWeightUnit(id, newWeightUnit) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setWeightUnit(newWeightUnit);
      }
    },
    changeVesselInstanceName(id, newName) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setVesselInstanceName(newName);
      }
    },
    changeVesselInstanceDescription(id, newDescription) {
      const vessel = self.vessels.get(id);
      if (vessel) {
        vessel.setVesselInstanceDescription(newDescription);
      }
    },
    convertVesselToModel(jsVesselModel) {
      if (self.vessels.has(jsVesselModel.id)) {
        return;
      }

      // self.cellLineItem.set(jsCellLineModel.id, CellLineItem.create({
      //   cellLineId: jsCellLineModel.cellLineId,
      //   id: jsCellLineModel.id.toString(),
      //   organism: jsCellLineModel.organism,
      //   tissue: jsCellLineModel.tissue,
      //   cellType: jsCellLineModel.cellType,
      //   mutation: jsCellLineModel.mutation,
      //   disease: jsCellLineModel.disease,
      //   itemDescription: jsCellLineModel.itemComment,
      //   bioSafetyLevel: jsCellLineModel.bioSafetyLevel,
      //   variant: jsCellLineModel.variant,
      //   optimalGrowthTemperature: jsCellLineModel.optimal_growth_temp,
      //   cryopreservationMedium: jsCellLineModel.cryopreservationMedium,
      //   cellLineName: jsCellLineModel.cellLineName,
      //   materialDescription: jsCellLineModel.materialDescription,
      //   gender: jsCellLineModel.gender,
      //   amount: jsCellLineModel.amount,
      //   unit: jsCellLineModel.unit,
      //   passage: jsCellLineModel.passage,
      //   contamination: jsCellLineModel.contamination,
      //   source: jsCellLineModel.source,
      //   growthMedium: jsCellLineModel.growthMedium,
      //   itemName: jsCellLineModel.itemName,
      //   shortLabel: jsCellLineModel.short_label,
      // }));
    },
    setMaterialProperties(id, properties) {
      const item = self.vessels.get(id);
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
      item.setVesselInstanceName(properties.vesselInstanceName);
      item.setVesselInstanceDescription(properties.vesselInstanceDescription);
    }
  }))
  .views((self) => ({
    getVessel(id) {
      return self.vessels.get(id);
    },
    // getAllVessels() {
    //   return Array.from(self.vessels.values());
    // },
    // hasVessel(id) {
    //   return self.vessels.has(id);
    // },
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

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

const VesselInstance = types.model({
  vesselInstanceName: types.maybeNull(types.string),
  vesselInstanceDescription: types.maybeNull(types.string),
  barCode: types.maybeNull(types.string),
  qrCode: types.maybeNull(types.string),
  weightAmount: types.maybeNull(types.string),
  weightUnit: types.maybeNull(types.string),
});

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
    vesselInstanceName: '',
    vesselInstanceDescription: '',
    barCode: '',
    qrCode: '',
    weightAmount: 0,
    weightUnit: types.string,
    shortLabel: types.maybeNull(types.string),
    changed: false,
    instances: types.optional(types.array(VesselInstance), []),
    is_new: types.optional(types.boolean, false),
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
    replaceVessel(tempId, serverVesselData) {
      if (self.vessels.has(tempId)) {
        self.vessels.delete(tempId);
      }
      self.convertVesselToModel(serverVesselData);
    },
    getInstances(vesselId) {
      const vessel = self.vessels.get(vesselId);
      return vessel ? vessel.instances : [];
    },
    addInstance(vesselId) {
      const vessel = self.vessels.get(vesselId);
      if (vessel) {
        vessel.instances.push(
          VesselInstance.create({
            vesselInstanceName: '',
            vesselInstanceDescription: '',
            barCode: '',
            qrCode: '',
            weightAmount: '',
            weightUnit: '',
          })
        );
      }
    },
    removeInstance(vesselId, index) {
      const vessel = self.vessels.get(vesselId);
      if (vessel && vessel.instances.length > index) {
        vessel.instances.splice(index, 1);
      }
    },
    updateInstance(vesselId, index, field, value) {
      const vessel = self.vessels.get(vesselId);
      if (vessel && vessel.instances[index]) {
        vessel.instances[index][field] = value;
      }
    },
    addEmptyContainer(id) {
      const container = Container.buildEmpty();
      container.container_type = 'dataset';
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
        container_type: container.container_type,
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
        shortLabel: jsVesselModel.short_label || '',
        is_new: jsVesselModel.is_new,
        vesselInstanceName: jsVesselModel.vesselInstanceName || '',
        vesselInstanceDescription: jsVesselModel.vesselInstanceDescription || '',
        barCode: jsVesselModel.barCode || '',
        qrCode: jsVesselModel.qrCode || '',
        weightAmount: jsVesselModel.weightAmount || 0,
        weightUnit: jsVesselModel.weightUnit || '',
        instances: jsVesselModel.instances?.length
          ? jsVesselModel.instances.map((instance) => ({
            vesselInstanceName: instance.vesselInstanceName || '',
            vesselInstanceDescription: instance.vesselInstanceDescription || '',
            barCode: instance.barCode || '',
            qrCode: instance.qrCode || '',
            weightAmount: instance.weightAmount || '',
            weightUnit: instance.weightUnit || '',
          }))
          : [],
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
    },
  }))
  .views((self) => ({
    getVessel(id) {
      return self.vessels.get(id);
    },
  }));

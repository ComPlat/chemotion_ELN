import { types } from 'mobx-state-tree';
import Container from 'src/models/Container';
import CellLine from 'src/models/cellLine/CellLine';

const MAX_AMOUNT = 1000000000000000000;

const CellLineAnalysis = types
  .model({
    id: '',
    children: types.array(types.late(() => CellLineAnalysis)),
    name: '',
    container_type: '',
    extended_metadata: '',
    description: ''

  }).actions((self) => ({
    setDescription(newValue) {
      self.description = newValue;
    }
  }
  ));

const CellLineItem = types
  .model({
    cellLineId: -1,
    id: '',
    organism: '',
    tissue: '',
    gender: '',
    cellType: '',
    mutation: '',
    disease: '',
    bioSafetyLevel: 'S0',
    variant: '',
    optimalGrowthTemperature: 0,
    cryopreservationMedium: '',
    cellLineName: '',
    materialDescription: '',
    amount: 0,
    passage: 0,
    contamination: '',
    shortLabel: '',
    unit: '',
    source: '',
    growthMedium: '',
    itemDescription: '',
    itemName: '',
    changed:false,
    container: types.maybe(CellLineAnalysis)
  }) .views((self) => ({
    isAmountValid() {
      return Number.isInteger(self.amount) && self.amount > 0 && self.amount < MAX_AMOUNT
    }
  }));

export const CellLineDetailsStore = types
  .model({
    cellLineItem: types.map(CellLineItem)
  })
  .actions((self) => ({
    changeItemName(id, newItemName) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).itemName = newItemName;
    },
    changeGrowthMedium(id, newGrowthMedium) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).growthMedium = newGrowthMedium;
    },
    changeSource(id, newSource) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).source = newSource;
    },
    changeAmount(id, newAmount) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).amount = newAmount;
    },
    changeUnit(id, newUnit) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).unit = newUnit;
    },
    changeContamination(id, newContamination) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).contamination = newContamination;
    },
    changePassage(id, newPassage) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).passage = newPassage;
    },
    changeCellLineName(id, newCellLineName) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).cellLineName = newCellLineName;
    },
    changeMutation(id, newMutation) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).mutation = newMutation;
    },
    changeDisease(id, newDisease) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).disease = newDisease;
    },
    changeOrganism(id, newOrganism) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).organism = newOrganism;
    },
    changeItemDescription(id, newDesc) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).itemDescription = newDesc;
    },
    changeMaterialDescription(id, newDesc) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).materialDescription = newDesc;
    },
    changeTissue(id, newTissue) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).tissue = newTissue;
    },
    changeOptimalGrowthTemp(id, newTemp) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).optimalGrowthTemperature = newTemp;
    },
    changeVariant(id, newVariant) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).variant = newVariant;
    },
    changeBioSafetyLevel(id, newBioSafetyLevel) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).bioSafetyLevel = newBioSafetyLevel;
    },
    changeCryoMedium(id, newCryoMedium) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).cryopreservationMedium = newCryoMedium;
    },
    changeGender(id, newGender) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).gender = newGender;
    },
    changeCellType(id, newType) {
      self.cellLineItem.get(id).changed = true;
      self.cellLineItem.get(id).cellType = newType;
    },
    removeCellLineFromStore(id) {
      self.cellLineItem.delete(id);
    },
    addEmptyContainer(id) {
      const container = Container.buildEmpty();
      container.container_type = 'analysis';
      self.cellLineItem.get(id).container.children
        .filter((element) => ~element.container_type.indexOf('analyses'))[0]
        .children.push(self.convertJsModelToMobxModel(container));
      return container;
    },
    setMaterialProperties(id, properties) {
      const item = self.cellLineItem.get(id);
      if (item === undefined) { throw new Error(`no cellline with id found: ${id}`); }

      item.bioSafetyLevel = properties.biosafety_level;
      item.cellType = properties.cell_type;
      item.cryopreservationMedium = properties.cryo_pres_medium;
      item.materialDescription = properties.description;
      item.disease = properties.disease;
      item.gender = properties.gender;
      this.changeOptimalGrowthTemp(id, properties.optimal_growth_temp);
      item.organism = properties.organism;
      item.tissue = properties.tissue;
      item.variant = properties.variant;
      item.mutation = properties.mutation;
      item.source = properties.source;
      item.growthMedium = properties.growth_medium;
    },
    convertJsModelToMobxModel(container) {
      return CellLineAnalysis.create({
        id: container.id,
        children: [],
        name: container.name,
        container_type: container.container_type
      });
    },
    convertCellLineToModel(jsCellLineModel) {
      if (self.cellLineItem.has(jsCellLineModel.id)) {
        return;
      }

      const innerAnalysis = CellLineAnalysis.create({
        id: jsCellLineModel.container.children[0].id,
        children: [],
        name: jsCellLineModel.container.children[0].name,
        container_type: jsCellLineModel.container.children[0].container_type
      });

      const rootAnalysis = CellLineAnalysis.create({
        id: jsCellLineModel.container.id,
        children: [innerAnalysis],
        name: jsCellLineModel.container.name,
        container_type: jsCellLineModel.container.container_type
      });

      self.cellLineItem.set(jsCellLineModel.id, CellLineItem.create({
        cellLineId: jsCellLineModel.cellLineId,
        id: jsCellLineModel.id.toString(),
        organism: jsCellLineModel.organism,
        tissue: jsCellLineModel.tissue,
        cellType: jsCellLineModel.cellType,
        mutation: jsCellLineModel.mutation,
        disease: jsCellLineModel.disease,
        itemDescription: jsCellLineModel.itemComment,
        bioSafetyLevel: jsCellLineModel.bioSafetyLevel,
        variant: jsCellLineModel.variant,
        optimalGrowthTemperature: jsCellLineModel.optimal_growth_temp,
        cryopreservationMedium: jsCellLineModel.cryopreservationMedium,
        cellLineName: jsCellLineModel.cellLineName,
        materialDescription: jsCellLineModel.materialDescription,
        gender: jsCellLineModel.gender,
        amount: jsCellLineModel.amount,
        unit: jsCellLineModel.unit,
        passage: jsCellLineModel.passage,
        contamination: jsCellLineModel.contamination,
        source: jsCellLineModel.source,
        growthMedium: jsCellLineModel.growthMedium,
        itemName: jsCellLineModel.itemName,
        shortLabel: jsCellLineModel.short_label,
        container: rootAnalysis
      }));
    }
  }))
  .views((self) => ({
    cellLines(id) {
      return self.cellLineItem.get(id);
    },
    analysisAmount(id) {
      return self.cellLineItem.get(id).container.children[0].children.length;
    },
    checkInputValidity(id) {
      const result = [];
      const item = self.cellLineItem.get(id);
      if (item.cellLineName.trim() === '') { result.push('cellLineName'); }
      if (item.source.trim() === '') { result.push('source'); }
      if (item.unit.trim() === '') { result.push('unit'); }
      if (!item.isAmountValid()) { result.push('amount'); }
      if (!Number.isInteger(item.passage) || item.passage === 0) { result.push('passage'); }
      return result;
    }
  }));

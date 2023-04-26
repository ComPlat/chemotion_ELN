import { types } from 'mobx-state-tree';

const CellLineItem = types
  .model({
    cellLineId: -1,
    id: -1,
    organism: '',
    tissue: '',
    cellType: '',
    mutation: '',
    disease: '',
    biosafetyLevel: 'S0',
    variant: '',
    optimalGrowthTemperature: 0,
    cryopreservationMedium: '',
    cellLineName: '',
    materialComment: '',
    amount: 0,
    passage: 0,
    contamination: '',
    source: '',
    growthMedium: '',
    itemComment: '',
    itemName:''
  })
  .actions((cellLine) => ({ setAmount(newAmount) { cellLine.amount = newAmount; } }));

export const CellLineDetailsStore = types
  .model({
    cellLineItem: types.map(CellLineItem)
  })
  .actions((self) => ({
    changeAmountOfCellLine(newAmount) {
      self.cellLineItem.amount = newAmount;
    },
    convertCellLineToModel(jsCellLineModel) {
      if (self.cellLineItem.has(jsCellLineModel.id)) {
        return;
      }
      self.cellLineItem.set(jsCellLineModel.cellLineId, CellLineItem.create({

        cellLineId: jsCellLineModel.cellLineId,
        id: jsCellLineModel.id,
        organism: jsCellLineModel.organism,
        tissue: jsCellLineModel.tissue,
        cellType: jsCellLineModel.cellType,
        mutation: jsCellLineModel.mutation,
        disease: jsCellLineModel.disease,
        biosafetyLevel: jsCellLineModel.biosafetyLevel,
        variant: jsCellLineModel.variant,
        optimalGrowthTemperature: jsCellLineModel.optimalGrowthTemperature,
        cryopreservationMedium: jsCellLineModel.cryopreservationMedium,
        cellLineName: jsCellLineModel.cellLineName,
        materialComment: jsCellLineModel.materialComment,
        amount: jsCellLineModel.amount,
        passage: jsCellLineModel.passage,
        contamination: jsCellLineModel.contamination,
        source: jsCellLineModel.source,
        growthMedium: jsCellLineModel.growthMedium,
        itemComment: jsCellLineModel.itemComment,
        itemName: jsCellLineModel.itemName
      }));
    }
  }))
  .views((self) => ({
    cellLines(id) {
      return self.cellLineItem.get(id);
    }
  }));

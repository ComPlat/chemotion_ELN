import { types } from 'mobx-state-tree';
import Container from 'src/models/Container';

const CellLineAnalysis = types
  .model({
    id: '',
    children: types.array(types.late(() => CellLineAnalysis)),
    name:'',
    container_type:''

  });

const CellLineItem = types
  .model({
    cellLineId: -1,
    id: '',
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
    itemName: '',
    container:types.maybe(CellLineAnalysis)
  });

export const CellLineDetailsStore = types
  .model({
    cellLineItem: types.map(CellLineItem)
  })
  .actions((self) => ({
    changeAmountOfCellLine(id, newAmount) {
      self.cellLineItem.get(id).amount = newAmount;
    },
    addEmptyContainer(id) {
      let container = Container.buildEmpty();
      container.container_type = "analysis";
      self.cellLineItem.get(id).container.children
        .filter(element=>~element.container_type.indexOf('analyses'))[0]
        .children.push(self.convertJsModelToMobxModel(container));
    },
    convertJsModelToMobxModel(container){
      return CellLineAnalysis.create({
        id:container.id,
        children:[],
        name:container.name,
        container_type:container.container_type
      })},
    convertCellLineToModel(jsCellLineModel) {
      if (self.cellLineItem.has(jsCellLineModel.id)) {
        return;
      }

      let innerAnalysis=CellLineAnalysis.create({
        id:jsCellLineModel.container.children[0].id,
        children:[],
        name:jsCellLineModel.container.children[0].name,
        container_type:jsCellLineModel.container.children[0].container_type
      });

      let rootAnalysis=CellLineAnalysis.create({
        id:jsCellLineModel.container.id,
        children:[innerAnalysis],
        name:jsCellLineModel.container.name,
        container_type:jsCellLineModel.container.container_type
      });




      self.cellLineItem.set(jsCellLineModel.id, CellLineItem.create({

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
        itemName: jsCellLineModel.itemName,
        container:rootAnalysis
      }));
    }
  }))
  .views((self) => ({
    cellLines(id) {
      return self.cellLineItem.get(id);
    },
    analysisAmount(id){
      return self.cellLineItem.get(id).container.children[0].children.length;
    }
  }));



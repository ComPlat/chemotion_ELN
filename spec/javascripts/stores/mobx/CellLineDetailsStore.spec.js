import expect from 'expect';
import { CellLineDetailsStore } from '@src/stores/mobx/CellLineDetailsStore';
import CellLineFactory from '@tests/factories/CellLineFactory';

const newMaterialProperties = {
  biosafety_level: 'S2',
  cell_type: 'changed_cell_type',
  cryo_pres_medium: 'changed_cryo_medium',
  description: 'changed material description',
  disease: 'changed_disease',
  gender: 'changed_gender',
  optimal_growth_temp: 100,
  organism: 'changed_organism',
  tissue: 'changed_tissue',
  mutation: 'changed_mutation',
  variant: 'changed_variant'
};

describe('CellLineDetailsStore', async () => {
  describe('.setMaterialProperties', async () => {
    describe('when object not available', async () => {
      it('raises an error', async () => {
        const store = CellLineDetailsStore.create({});
        expect(() => store.setMaterialProperties(-1, {})).toThrowError('no cellline with id found: -1');
      });
    });
    describe('when data is valid', async () => {
      it('material properties are changed', async () => {
        const store = CellLineDetailsStore.create({});
        const cellLineSample = await CellLineFactory.build('CellLineFactory.heLa');
        store.convertCellLineToModel(cellLineSample);

        store.setMaterialProperties(cellLineSample.id, newMaterialProperties);

        const storeSample = store.cellLines(cellLineSample.id);
        expect(storeSample.cellLineName).toBe('HeLa');
        expect(storeSample.organism).toBe('changed_organism');
        expect(storeSample.tissue).toBe('changed_tissue');
        expect(storeSample.cellType).toBe('changed_cell_type');
        expect(storeSample.mutation).toBe('changed_mutation');
        expect(storeSample.disease).toBe('changed_disease');
        expect(storeSample.bioSafetyLevel).toBe('S2');
        expect(storeSample.optimalGrowthTemperature).toBe(100);
        expect(storeSample.cryopreservationMedium).toBe('changed_cryo_medium');
        expect(storeSample.materialDescription).toBe('changed material description');
        expect(storeSample.gender).toBe('changed_gender');
      });
    });
  });
  describe('.convertCellLineToModel', async () => {
    describe('when object not available', async () => {
      it('creates a valid entry in the store', async () => {
        const store = CellLineDetailsStore.create({});
        const cellLineSample = await CellLineFactory.build('CellLineFactory.heLa');
        store.convertCellLineToModel(cellLineSample);
        const storeSample = store.cellLines(cellLineSample.id);

        expect(storeSample.cellLineName).toBe('HeLa');
        expect(storeSample.id).toBe('1');
        expect(storeSample.cellLineId).toBe(2);
        expect(storeSample.organism).toBe('Human');
        expect(storeSample.tissue).toBe('Cervix');
        expect(storeSample.cellType).toBe('Epithelium');
        expect(storeSample.mutation).toBe('None');
        expect(storeSample.disease).toBe('cervical cancer');
        expect(storeSample.bioSafetyLevel).toBe('S1');
        expect(storeSample.optimalGrowthTemperature).toBe(36);
        expect(storeSample.cryopreservationMedium).toBe('DMSO Serum free media, contains 8.7% DMSO in MEM supplemented with methyl cellulose');
        expect(storeSample.materialDescription).toBe('Test data for cell line material');
        expect(storeSample.gender).toBe('female');
        expect(storeSample.amount).toBe(1_000_000);
        expect(storeSample.passage).toBe(1);
        expect(storeSample.contamination).toBe('Myococci');
        expect(storeSample.source).toBe('The Random Company');
        expect(storeSample.growthMedium).toBe('DMEM (High Glucose) + 10% FBS');
        expect(storeSample.itemDescription).toBe('Test data for cell line sample');
        expect(storeSample.shortLabel).toBe('SHA-001');
        expect(storeSample.itemName).toBe('Probe DX3-751');
      });
    });
  });
  describe('.changeAmount', async () => {
    const store = CellLineDetailsStore.create({});
    const cellLineSample = await CellLineFactory.build('CellLineFactory.heLa');
    store.convertCellLineToModel(cellLineSample);
    const storeSample = store.cellLines(cellLineSample.id);

    describe('when input is valid', async () => {
      it('sets the correct amount', async () => {
        store.changeAmount(storeSample.id, Number('1e2'));
        expect(storeSample.amount).toBe(100);
      });
    });
  });
});

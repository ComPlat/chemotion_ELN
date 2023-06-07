import expect from 'expect';
import { CellLineDetailsStore } from 'src/stores/mobx/CellLineDetailsStore';
import CellLineFactory from 'factories/CellLineFactory';


describe('CellLineDetailsStore', async () => {  
    const store = CellLineDetailsStore.create({})
    describe('.setMaterialProperties', async() => {
        describe('when object not available', async() => {
            it('raises an error', async() => {
                expect(() => store.setMaterialProperties(-1,{})).toThrowError('no cellline with id found: -1');
            });
        });
    });
    describe('.convertCellLineToModel', async() => {
        describe('when object not available', async() => {
            it('creates a valid entry in the store', async() => {
                const cellLineSample = await CellLineFactory.build('heLa');
                store.convertCellLineToModel(cellLineSample);
                const storeSample =store.cellLines(cellLineSample.id);

                expect(storeSample.cellLineName).toBe('HeLa');
                expect(storeSample.id).toBe("1");
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
            });
        });
    });
});
import expect from 'expect';
import { CellLineDetailsStore } from 'src/stores/mobx/CellLineDetailsStore';


describe('CellLineDetailsStore', () => {
    const store = CellLineDetailsStore.create({})
    describe('.setMaterialProperties', () => {
        it('when object not available', () => {
            expect(() => store.setMaterialProperties(-1,{})).toThrowError('no cellline with id found: -1');
        });
    });
});


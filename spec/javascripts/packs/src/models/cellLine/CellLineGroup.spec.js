import expect from 'expect';
import CellLineFactory from '@tests/factories/CellLineFactory';
import CellLineGroup from '@src/models/cellLine/CellLineGroup';

describe('CellLineGroup', async () => {
  describe('buildFromElements()', async () => {
    context('when no elements given', async () => {
      it('empty array returned', () => {
        const cellLineGoups = CellLineGroup.buildFromElements();
        expect(cellLineGoups.length).toBe(0);
      });
    });

    context('when all elements are in the same group', async () => {
      const cellLine1 = await CellLineFactory.build('CellLineFactory.with_name');
      const cellLine2 = await CellLineFactory.build('CellLineFactory.with_name');
      const cellLine3 = await CellLineFactory.build('CellLineFactory.with_name');

      it('array with one group returned containing 3 cell line items', async () => {
        const cellLineGoups = CellLineGroup.buildFromElements([cellLine1, cellLine2, cellLine3]);
        expect(cellLineGoups.length).toBe(1);
        expect(cellLineGoups[0].cellLineItems.length).toBe(3);
      });
    });

    context('when  elements are in 2 groups', async () => {
      const cellLine1 = await CellLineFactory.build('CellLineFactory.with_name');
      const cellLine2 = await CellLineFactory.build('CellLineFactory.with_name');
      const cellLine3 = await CellLineFactory.build('CellLineFactory.with_name');
      const cellLine4 = await CellLineFactory.build('CellLineFactory.with_other_name');
      const cellLine5 = await CellLineFactory.build('CellLineFactory.with_other_name');

      it('array with 2 groups returned containing 3 and 2 cell line items', async () => {
        const cellLineGoups = CellLineGroup.buildFromElements(
          [cellLine1, cellLine2, cellLine3, cellLine4, cellLine5]
        );
        expect(cellLineGoups.length).toBe(2);
        expect(cellLineGoups[0].cellLineItems.length).toBe(3);
        expect(cellLineGoups[1].cellLineItems.length).toBe(2);
      });
    });
  });
});

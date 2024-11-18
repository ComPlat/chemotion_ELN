import expect from 'expect';
import CellLine from '../../../../../../app/javascript/src/models/cellLine/CellLine';

describe('CellLine', async () => {
  describe('createEmpty()', () => {
    context('when collection id is valid', () => {
      it('new empty cell line item created', () => {
        const cellLine = CellLine.buildEmpty(0,'');
        expect(cellLine.collectionId).toBe(0);
      });
    });
    context('when collection id is not given', () => {
      it('error was thrown', () => {
        expect(() => CellLine.buildEmpty()).toThrowError('collection id is not valid: undefined');
      });
    });
    context('when collection id is not a number', () => {
      it('error was thrown', () => {
        expect(() => CellLine.buildEmpty('dummy')).toThrowError('collection id is not valid: dummy');
      });
    });
  });
});

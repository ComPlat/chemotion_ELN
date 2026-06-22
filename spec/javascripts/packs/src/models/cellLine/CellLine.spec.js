import expect from 'expect';
import CellLine from '../../../../../../app/javascript/src/models/cellLine/CellLine';

describe('CellLine', async () => {
  describe('adoptPropsFromMobXModel()', () => {
    it('copies attachments from the MobX model', () => {
      const cellLine = CellLine.buildEmpty(0, '');
      cellLine.adoptPropsFromMobXModel({ attachments: [{ id: 1, filename: 'test.pdf' }] });
      expect(cellLine.attachments).toEqual([{ id: 1, filename: 'test.pdf' }]);
    });

    it('sets attachments to empty array when MobX model has no attachments', () => {
      const cellLine = CellLine.buildEmpty(0, '');
      cellLine.adoptPropsFromMobXModel({});
      expect(cellLine.attachments).toEqual([]);
    });

    it('does not share reference with MobX model attachments', () => {
      const cellLine = CellLine.buildEmpty(0, '');
      const mobxAttachments = [{ id: 1, filename: 'test.pdf' }];
      cellLine.adoptPropsFromMobXModel({ attachments: mobxAttachments });
      expect(cellLine.attachments).not.toBe(mobxAttachments);
    });
  });

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

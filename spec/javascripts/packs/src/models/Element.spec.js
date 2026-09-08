import expect from 'expect';
import Element from 'src/models/Element';

describe('Element', () => {
  describe('isReadOnly', () => {
    it('is read-only only when the backend sends an explicit can_update: false', () => {
      const element = new Element({ id: 1, can_update: false });
      expect(element.isReadOnly).toEqual(true);
    });

    it('is editable when can_update is true', () => {
      const element = new Element({ id: 1, can_update: true });
      expect(element.isReadOnly).toEqual(false);
    });

    it('is editable when the backend omits can_update (undefined defaults to editable)', () => {
      const element = new Element({ id: 1 });
      expect(element.isReadOnly).toEqual(false);
    });
  });
});

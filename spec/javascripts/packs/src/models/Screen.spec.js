import expect from 'expect';
import Screen from 'src/models/Screen';

describe('Screen', () => {
  describe('can_update', () => {
    it('defaults to true when the backend omits the flag', () => {
      const screen = new Screen({ name: 'Screen', type: 'screen' });
      expect(screen.can_update).toEqual(true);
    });

    it('keeps an explicit false from the backend', () => {
      const screen = new Screen({ name: 'Screen', type: 'screen', can_update: false });
      expect(screen.can_update).toEqual(false);
    });

    it('keeps an explicit true from the backend', () => {
      const screen = new Screen({ name: 'Screen', type: 'screen', can_update: true });
      expect(screen.can_update).toEqual(true);
    });
  });

  describe('buildEmpty()', () => {
    it('defaults can_update to true for a new screen', () => {
      const screen = Screen.buildEmpty(1);
      expect(screen.can_update).toEqual(true);
    });
  });
});

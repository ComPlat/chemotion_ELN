import expect from 'expect';
import ReactionFactory from 'factories/ReactionFactory';
import { clampTemperature, clampTemperatureText } from 'src/models/Reaction';
import ReactionUpdateHandler, {
  handleInputChange
} from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';

/*
The scheme tab and the variations grid share their inputs, which accept a leading minus sign. What
they change is held to what makes sense: no negative amounts, no temperature below absolute zero.
*/
describe('reaction value limits', () => {
  describe('clampTemperature', () => {
    it('raises a temperature below absolute zero to it, in each unit', () => {
      expect(clampTemperature(-300, '°C')).toBe(-273.15);
      expect(clampTemperature(-500, '°F')).toBe(-459.67);
      expect(clampTemperature(-1, 'K')).toBe(0);
    });

    it('leaves possible temperatures, empty values and unknown units alone', () => {
      expect(clampTemperature(-78, '°C')).toBe(-78);
      expect(clampTemperature('', '°C')).toBe('');
      expect(clampTemperature(-300, 'X')).toBe(-300);
    });
  });

  describe('clampTemperatureText', () => {
    it('holds a typed number to absolute zero and keeps it text', () => {
      expect(clampTemperatureText('-300', '°C')).toBe('-273.15');
      expect(clampTemperatureText('-78', '°C')).toBe('-78');
    });

    it('leaves free text alone', () => {
      expect(clampTemperatureText('reflux', '°C')).toBe('reflux');
      expect(clampTemperatureText('-', '°C')).toBe('-');
      expect(clampTemperatureText('-300 to -20', '°C')).toBe('-300 to -20');
    });
  });

  describe('in a reaction', () => {
    let reaction;
    let changed;
    let handler;

    beforeEach(async () => {
      reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      reaction.temperature = { data: [], userText: '', valueUnit: '°C' };
      changed = null;
      handler = new ReactionUpdateHandler({
        reaction,
        onReactionChange: (r) => { changed = r; },
        onLockEquivColChange: () => {},
      });
    });

    it('reads a negative amount as 0', () => {
      const [, sample] = reaction.starting_materials;
      handler.handleMaterialsChange({
        type: 'amountChanged', sampleID: sample.id, amount: { value: -5, unit: 'g' },
      });

      expect(changed.starting_materials[1].amount_value).toBe(0);
    });

    it('holds a typed reaction temperature to absolute zero', () => {
      handleInputChange('temperature', { target: { value: '-500' } }, reaction, (r) => { changed = r; });

      expect(changed.temperature.userText).toBe('-273.15');
    });
  });
});

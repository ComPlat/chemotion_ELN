import expect from 'expect';
import {
  convertUnit,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

describe('ReactionVariationsUtils', () => {
  it('converts units', () => {
    expect(convertUnit(1, 'g', 'mg')).toBe(1000);
    expect(convertUnit(1, 'mg', 'g')).toBe(0.001);
    expect(convertUnit(1, 'l', 'ml')).toBe(1000);
    expect(convertUnit(1, 'ml', 'l')).toBe(0.001);
    expect(convertUnit(1, '°C', '°F')).toBe(33.8);
    expect(convertUnit(1, '°F', '°C')).toBeCloseTo(-17.2, 0.1);
    expect(convertUnit(1, 'Second(s)', 'Minute(s)')).toBeCloseTo(0.0167, 0.00001);
    expect(convertUnit(1, 'Minute(s)', 'Second(s)')).toBe(60);
  });
});

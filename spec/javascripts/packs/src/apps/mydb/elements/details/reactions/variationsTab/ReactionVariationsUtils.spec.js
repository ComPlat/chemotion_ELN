import expect from 'expect';
import {
  convertUnit, createVariationsRow, copyVariationsRow, updateVariationsRow
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import { setUpReaction } from 'helper/reactionVariationsHelpers';

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
  it('creates a row in the variations table', async () => {
    const reaction = await setUpReaction();
    const row = createVariationsRow(reaction, reaction.variations);
    const nonReferenceStartingMaterial = Object.values(row.startingMaterials).find(
      (material) => !material.aux.isReference
    );
    const reactant = Object.values(row.reactants)[0];
    expect(row.id).toBe(4);
    expect(row.analyses).toEqual([]);
    expect(row.properties).toEqual({
      temperature: { value: '', unit: '°C' },
      duration: { value: NaN, unit: 'Second(s)' },
    });
    expect(Object.values(row.products).map((product) => product.aux.yield)).toEqual([100, 100]);
    expect(nonReferenceStartingMaterial.aux.equivalent).toBe(1);
    expect(reactant.aux.equivalent).toBe(1);
  });
  it('copies a row in the variations table', async () => {
    const reaction = await setUpReaction();
    const row = reaction.variations[0];
    row.analyses = [42];
    const copiedRow = copyVariationsRow(row, reaction.variations);
    expect(copiedRow.id).toBeGreaterThan(row.id);
    expect(copiedRow.analyses).toEqual([]);
  });
  it('updates a row in the variations table', async () => {
    const reaction = await setUpReaction();
    const row = reaction.variations[0];
    const referenceMaterialID = Object.keys(row.startingMaterials).find(
      (materialID) => row.startingMaterials[materialID].aux.isReference
    );
    const referenceMaterial = Object.values(row.startingMaterials).find(
      (material) => material.aux.isReference
    );
    const updatedRow = updateVariationsRow(
      row,
      `startingMaterials.${referenceMaterialID}`,
      { ...referenceMaterial, value: referenceMaterial.value * 10 },
      reaction.hasPolymers()
    );
    expect(Object.values(row.reactants)[0].aux.equivalent).toBeGreaterThan(
      Object.values(updatedRow.reactants)[0].aux.equivalent
    );
    expect(Object.values(row.products)[0].aux.yield).toBeGreaterThan(
      Object.values(updatedRow.products)[0].aux.yield
    );
  });
});

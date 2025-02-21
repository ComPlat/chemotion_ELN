import expect from 'expect';
import {
  convertUnit, createVariationsRow, copyVariationsRow, updateVariationsRow, updateColumnDefinitions
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReactionMaterials, getMaterialColumnGroupChild, getReactionMaterialsIDs
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import { setUpReaction, getColumnGroupChild } from 'helper/reactionVariationsHelpers';

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
  it('creates a row in the variations table with selected materials', async () => {
    const reaction = await setUpReaction();

    expect(Object.keys(reaction.variations[0].products).length).toBe(2);

    const materials = getReactionMaterials(reaction);
    const materialIDs = getReactionMaterialsIDs(materials);
    materialIDs.products.pop();

    const row = createVariationsRow(
      {
        materials,
        materialIDs,
        variations: reaction.variations,
        durationValue: '',
        durationUnit: 'Hour(s)',
        temperatureValue: '',
        temperatureUnit: '°C'
      }
    );

    expect(Object.keys(row.products).length).toBe(1);

    const nonReferenceStartingMaterial = Object.values(row.startingMaterials).find(
      (material) => !material.aux.isReference
    );
    const reactant = Object.values(row.reactants)[0];
    expect(row.id).toBe(4);
    expect(row.analyses).toEqual([]);
    expect(row.notes).toEqual('');
    expect(row.properties).toEqual({
      temperature: { value: '', unit: '°C' },
      duration: { value: NaN, unit: 'Second(s)' },
    });
    expect(Object.values(row.products).map((product) => product.yield.value)).toEqual([100]);
    expect(nonReferenceStartingMaterial.equivalent.value).toBe(1);
    expect(reactant.equivalent.value).toBe(1);
  });
  it('copies a row in the variations table', async () => {
    const reaction = await setUpReaction();
    const row = reaction.variations[0];
    row.analyses = [42];
    row.notes = 'foo bar baz';
    const copiedRow = copyVariationsRow(row, reaction.variations);
    expect(copiedRow.id).toBeGreaterThan(row.id);
    expect(copiedRow.analyses).toEqual([]);
    expect(copiedRow.notes).toEqual('');
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
      { ...referenceMaterial, mass: { ...referenceMaterial.mass, value: referenceMaterial.mass.value * 10 } },
      reaction.hasPolymers()
    );
    expect(Object.values(row.reactants)[0].equivalent.value).toBeGreaterThan(
      Object.values(updatedRow.reactants)[0].equivalent.value
    );
    expect(Object.values(row.products)[0].yield.value).toBeGreaterThan(
      Object.values(updatedRow.products)[0].yield.value
    );
  });
  it('updates the definition of a column', async () => {
    const reaction = await setUpReaction();
    const reactionMaterials = getReactionMaterials(reaction);
    const field = `startingMaterials.${reactionMaterials.startingMaterials[0].id}`;
    const columnDefinitions = Object.entries(reactionMaterials).map(([materialType, materials]) => ({
      groupId: materialType,
      children: materials.map((material) => getMaterialColumnGroupChild(material, materialType, null, false))
    }));
    expect(getColumnGroupChild(columnDefinitions, 'startingMaterials', field).cellDataType).toBe('material');
    const updatedColumnDefinitions = updateColumnDefinitions(
      columnDefinitions,
      field,
      'cellDataType',
      'equivalent'
    );
    expect(getColumnGroupChild(updatedColumnDefinitions, 'startingMaterials', field).cellDataType).toBe('equivalent');
  });
});

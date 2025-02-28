import expect from 'expect';
import {
  convertUnit, createVariationsRow, copyVariationsRow, updateVariationsRow, updateColumnDefinitions,
  removeObsoleteColumnsFromVariations, removeObsoleteColumnDefinitions, addMissingColumnDefinitions,
  addMissingColumnsToVariations
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReactionMaterials, getMaterialColumnGroupChild, getReactionMaterialsIDs
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  setUpReaction,
  getColumnGroupChild,
  getSelectedColumns,
  getColumnDefinitionsMaterialIDs
} from 'helper/reactionVariationsHelpers';

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
        selectedColumns: getSelectedColumns(materialIDs),
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
    expect(row.metadata.analyses).toEqual([]);
    expect(row.metadata.notes).toEqual('');
    expect(row.properties).toEqual({
      temperature: { value: '', unit: '°C' },
      duration: { value: NaN, unit: 'Second(s)' },
    });
    expect(Object.values(row.products).map((product) => product.yield.value)).toEqual([100]);
    expect(nonReferenceStartingMaterial.equivalent.value).toBe(1);
    expect(reactant.equivalent.value).toBe(1);
  });
  it('adds missing columns to variations', async () => {
    const reaction = await setUpReaction();
    const { variations } = reaction;

    let updatedVariations = removeObsoleteColumnsFromVariations(variations, { properties: [], metadata: [] });

    updatedVariations = addMissingColumnsToVariations({
      materials: {},
      selectedColumns: { properties: ['temperature', 'duration'], metadata: ['notes', 'analyses'] },
      variations: updatedVariations,
      durationValue: 42,
      durationUnit: 'Second(s)',
      temperatureValue: 42,
      temperatureUnit: '°C',
    });

    expect(updatedVariations[0].properties.duration.value).toBe(42);
    expect(updatedVariations[0].properties.temperature.value).toBe(42);
    expect(updatedVariations[0].metadata.notes).toBe('');
    expect(Array.isArray(updatedVariations[0].metadata.analyses));
    expect(updatedVariations[0].metadata.analyses.length === 0);
  });
  it('removes obsolete materials from variations', async () => {
    const reaction = await setUpReaction();
    const productIDs = reaction.products.map((product) => product.id);
    reaction.variations.forEach((variation) => {
      expect(Object.keys(variation.products)).toEqual(productIDs);
    });

    reaction.products.pop();
    const updatedProductIDs = reaction.products.map((product) => product.id);
    const materialIDs = getReactionMaterialsIDs(getReactionMaterials(reaction));
    const updatedVariations = removeObsoleteColumnsFromVariations(reaction.variations, materialIDs);
    updatedVariations
      .forEach((variation) => {
        expect(Object.keys(variation.products)).toEqual(updatedProductIDs);
      });
  });
  it('adds missing column definitions', async () => {
    const columnDefinitions = [
      {
        groupId: 'metadata',
        children: []
      },
      {
        groupId: 'properties',
        children: []
      },
    ];

    const columns = { properties: ['temperature', 'duration'], metadata: ['notes', 'analyses'] };
    const updatedColumnDefinitions = addMissingColumnDefinitions(columnDefinitions, columns, {}, false);

    const metadataChildren = updatedColumnDefinitions.find((entry) => entry.groupId === 'metadata').children;
    expect(metadataChildren.some((child) => child.field === 'metadata.analyses'));
    expect(metadataChildren.some((child) => child.field === 'metadata.notes'));

    const propertiesChildren = updatedColumnDefinitions.find((entry) => entry.groupId === 'properties').children;
    expect(propertiesChildren.some((child) => child.field === 'properties.temperature'));
    expect(propertiesChildren.some((child) => child.field === 'properties.duration'));
  });
  it('removes obsolete materials from column definitions', async () => {
    const reaction = await setUpReaction();
    const reactionMaterials = getReactionMaterials(reaction);
    const columnDefinitions = Object.entries(reactionMaterials).map(([materialType, materials]) => ({
      groupId: materialType,
      children: materials.map((material) => getMaterialColumnGroupChild(material, materialType, false))
    }));

    const startingMaterialIDs = reactionMaterials.startingMaterials.map((material) => material.id);
    expect(getColumnDefinitionsMaterialIDs(columnDefinitions, 'startingMaterials')).toEqual(startingMaterialIDs);

    reactionMaterials.startingMaterials.pop();
    const updatedStartingMaterialIDs = reactionMaterials.startingMaterials.map((material) => material.id);
    const updatedColumnDefinitions = removeObsoleteColumnDefinitions(
      columnDefinitions,
      getReactionMaterialsIDs(reactionMaterials)
    );
    expect(getColumnDefinitionsMaterialIDs(
      updatedColumnDefinitions,
      'startingMaterials'
    )).toEqual(updatedStartingMaterialIDs);
  });
  it('copies a row in the variations table', async () => {
    const reaction = await setUpReaction();
    const row = reaction.variations[0];
    row.metadata.analyses = [42];
    row.metadata.notes = 'foo bar baz';
    const copiedRow = copyVariationsRow(row, reaction.variations);
    expect(copiedRow.id).toBeGreaterThan(row.id);
    expect(copiedRow.metadata.analyses).toEqual([]);
    expect(copiedRow.metadata.notes).toEqual('');
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
      children: materials.map((material) => getMaterialColumnGroupChild(material, materialType, false))
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

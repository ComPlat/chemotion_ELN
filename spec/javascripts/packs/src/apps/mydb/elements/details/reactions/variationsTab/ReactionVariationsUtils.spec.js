import expect from 'expect';
import sinon from 'sinon';
import {
  convertUnit, createVariationsRow, copyVariationsRow, updateVariationsRow,
  removeObsoleteColumnsFromVariations, removeObsoleteColumnDefinitions, addMissingColumnDefinitions,
  addMissingColumnsToVariations, getVariationsColumns, convertGenericUnit, getColumnDefinitions,
  getUserFacingEntryName, getSegmentData, formatReactionSegments,
  setGroupColDefAttribute, setLeafColDefAttribute, getInitialLayout,
  getEntryVisibility, setEntryVisibility, getEntryDisplayUnits, setEntryDisplayUnits,
  getGroupHeaderNames, setGroupHeaderNames, getLayout, setLayout,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import UserStore from 'src/stores/alt/stores/UserStore';
import {
  getReactionMaterials, getMaterialColumnGroupChild
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  setUpReaction,
  getSelectedColumns,
  getColumnDefinitionsMaterialIDs,
  getReactionMaterialsIDs
} from 'helper/reactionVariationsHelpers';
import { reactionVariationSegments, reactionSegments } from 'fixture/reaction';

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
  it('converts generic units', () => {
    expect(convertGenericUnit(1, 'g_l', 'mg_l', 'concentration')).toBe(1000);
    expect(convertGenericUnit(1, 'mg_l', 'g_l', 'concentration')).toBe(0.001);
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
    expect(row.metadata.group).toEqual({ group: 1, subgroup: 1 });
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
      segments: {},
      selectedColumns: { properties: ['temperature', 'duration'], metadata: ['notes', 'analyses', 'group'] },
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
    expect(updatedVariations[0].metadata.group).toEqual({ group: 1, subgroup: 1 });
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

    const columns = { properties: ['temperature', 'duration'], metadata: ['notes', 'analyses', 'group'] };
    const updatedColumnDefinitions = addMissingColumnDefinitions(columnDefinitions, columns, {}, false);

    const metadataChildren = updatedColumnDefinitions.find((entry) => entry.groupId === 'metadata').children;
    expect(metadataChildren.some((child) => child.field === 'metadata.analyses'));
    expect(metadataChildren.some((child) => child.field === 'metadata.notes'));
    expect(metadataChildren.some((child) => child.field === 'metadata.group'));

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
    row.metadata.group = { group: 42, subgroup: 42 };
    const copiedRow = copyVariationsRow(row, reaction.variations);
    expect(copiedRow.id).toBeGreaterThan(row.id);
    expect(copiedRow.metadata.analyses).toEqual([]);
    expect(copiedRow.metadata.notes).toEqual('');
    expect(copiedRow.metadata.group).toEqual({ group: 1, subgroup: 1 });
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
  it('gets column names from variations table', async () => {
    const reaction = await setUpReaction();
    const reactionMaterialsIDs = getReactionMaterialsIDs(getReactionMaterials(reaction));
    const variationsColumns = getVariationsColumns(reaction.variations);

    expect(variationsColumns.startingMaterials).toEqual(reactionMaterialsIDs.startingMaterials);
    expect(variationsColumns.properties).toEqual(expect.arrayContaining(['duration', 'temperature']));
    expect(variationsColumns.metadata).toEqual(expect.arrayContaining(['notes', 'analyses', 'group']));

    const emptyVariationsColumns = getVariationsColumns([]);
    expect(emptyVariationsColumns.startingMaterials).toEqual([]);
    expect(emptyVariationsColumns.properties).toEqual([]);
    expect(emptyVariationsColumns.metadata).toEqual([]);
  });
  it('gets column definitions', async () => {
    const selectedColumns = {
      startingMaterials: [],
      reactants: [],
      products: [],
      solvents: [],
      properties: [],
      metadata: [],
      segments: [
        'foo',
      ]
    };
    const columnDefinitions = getColumnDefinitions(selectedColumns, {}, reactionVariationSegments, false);
    const segmentGroup = columnDefinitions.find((colDef) => colDef.groupId === 'segments');
    const segmentSubGroup = segmentGroup.children[0];
    const layerAfieldA = segmentSubGroup.children.find((child) => child.entry === 'layer<layera>field<fielda>');
    const layerAfieldB = segmentSubGroup.children.find((child) => child.entry === 'layer<layera>field<fieldb>');

    expect(layerAfieldA.displayUnit).toBe('ng_l');
    expect(layerAfieldA.units).toEqual(['ng_l', 'mg_l', 'g_l']);
    expect(layerAfieldB.units).toEqual([null]);
  });
  it('gets segment data', () => {
    const segmentDataFoo = getSegmentData(reactionVariationSegments.foo);
    expect(Object.keys(segmentDataFoo)).toEqual(Object.keys(reactionVariationSegments.foo));
    expect(segmentDataFoo['layer<layera>field<fielda>'].quantity).toBe('concentration');
    const segmentDataBar = getSegmentData(reactionVariationSegments.bar);
    expect(Object.keys(segmentDataBar)).toEqual(Object.keys(reactionVariationSegments.bar));
    expect(segmentDataBar['layer<bar>field<a>'].options).toEqual(['optiona', 'optionb', 'optionc']);
  });
  it('formats entry names', () => {
    expect(getUserFacingEntryName('fooBar')).toBe('foo bar');
    expect(getUserFacingEntryName('layer<foo>field<bar>')).toBe('foo / bar');
  });
  it('formats reaction segments', () => {
    const formattedSegment = formatReactionSegments(reactionSegments);
    expect(formattedSegment).toEqual(reactionVariationSegments);
  });

  describe('setGroupColDefAttribute', () => {
    const columnDefinitions = [
      {
        groupId: 'startingMaterials',
        children: [
          { groupId: 'mat-1', headerName: 'Water', children: [] },
          { groupId: 'mat-2', headerName: 'Ethanol', children: [] },
        ]
      },
      {
        groupId: 'properties',
        children: [
          { groupId: 'temperature', headerName: 'T' },
        ]
      }
    ];

    it('sets an attribute on a nested subgroup', () => {
      const result = setGroupColDefAttribute(columnDefinitions, 'startingMaterials', 'mat-1', 'headerName', 'H2O');
      const subGroup = result.find((g) => g.groupId === 'startingMaterials').children.find((c) => c.groupId === 'mat-1');
      expect(subGroup.headerName).toBe('H2O');
    });

    it('does not modify the original column definitions', () => {
      setGroupColDefAttribute(columnDefinitions, 'startingMaterials', 'mat-1', 'headerName', 'H2O');
      const subGroup = columnDefinitions.find((g) => g.groupId === 'startingMaterials').children.find((c) => c.groupId === 'mat-1');
      expect(subGroup.headerName).toBe('Water');
    });

    it('returns column definitions unchanged when groupId is not a nested column group', () => {
      const result = setGroupColDefAttribute(columnDefinitions, 'properties', 'temperature', 'headerName', 'Temp');
      expect(result).toBe(columnDefinitions);
    });
  });

  describe('setLeafColDefAttribute', () => {
    const columnDefinitions = [
      {
        groupId: 'properties',
        children: [
          {
            colId: 'properties.temperature',
            field: 'properties.temperature',
            displayUnit: '°C',
          },
          {
            colId: 'properties.duration',
            field: 'properties.duration',
            displayUnit: 'Second(s)',
          },
        ]
      },
      {
        groupId: 'startingMaterials',
        children: [
          {
            groupId: 'mat-1',
            children: [
              { colId: 'startingMaterials.mat-1.amount', field: 'startingMaterials.mat-1', displayUnit: 'mol' }
            ]
          }
        ]
      }
    ];

    it('sets an attribute on a matching leaf column', () => {
      const result = setLeafColDefAttribute(columnDefinitions, 'properties.temperature', 'displayUnit', 'K');
      const leaf = result.find((g) => g.groupId === 'properties').children.find((c) => c.colId === 'properties.temperature');
      expect(leaf.displayUnit).toBe('K');
    });

    it('does not affect non-matching leaves', () => {
      const result = setLeafColDefAttribute(columnDefinitions, 'properties.temperature', 'displayUnit', 'K');
      const leaf = result.find((g) => g.groupId === 'properties').children.find((c) => c.colId === 'properties.duration');
      expect(leaf.displayUnit).toBe('Second(s)');
    });

    it('does not modify the original column definitions', () => {
      setLeafColDefAttribute(columnDefinitions, 'properties.temperature', 'displayUnit', 'K');
      const leaf = columnDefinitions.find((g) => g.groupId === 'properties').children.find((c) => c.colId === 'properties.temperature');
      expect(leaf.displayUnit).toBe('°C');
    });

    it('sets an attribute on a deeply nested leaf', () => {
      const result = setLeafColDefAttribute(columnDefinitions, 'startingMaterials.mat-1.amount', 'displayUnit', 'mmol');
      const leaf = result
        .find((g) => g.groupId === 'startingMaterials').children
        .find((sg) => sg.groupId === 'mat-1').children
        .find((c) => c.colId === 'startingMaterials.mat-1.amount');
      expect(leaf.displayUnit).toBe('mmol');
    });
  });

  describe('getInitialLayout', () => {
    let userStoreStub;

    beforeEach(() => {
      userStoreStub = sinon.stub(UserStore, 'getState').returns({ currentUser: { id: 7 } });
    });

    afterEach(() => {
      userStoreStub.restore();
      localStorage.clear();
    });

    it('returns {} when no layout is stored', () => {
      expect(getInitialLayout(42)).toEqual({});
    });

    it('returns the stored layout', () => {
      const layout = { entries: { 'startingMaterials.mat-1.amount': false }, displayUnits: {}, groupHeaderNames: {} };
      localStorage.setItem('user7-reaction42-reactionVariationsLayout', JSON.stringify(layout));
      expect(getInitialLayout(42)).toEqual(layout);
    });
  });

  describe('getEntryVisibility', () => {
    const columnDefinitions = [
      {
        groupId: 'startingMaterials',
        children: [
          {
            groupId: 'mat-1',
            children: [
              { entry: 'amount', colId: 'startingMaterials.mat-1.amount', hide: false },
              { entry: 'mass', colId: 'startingMaterials.mat-1.mass', hide: true },
              { entry: 'equivalent', colId: 'startingMaterials.mat-1.equivalent' },
            ]
          }
        ]
      },
      {
        groupId: 'properties',
        children: [
          { entry: 'temperature', colId: 'properties.temperature' }
        ]
      }
    ];

    it('returns visibility keyed by dot-separated path for nested column groups', () => {
      const result = getEntryVisibility(columnDefinitions);
      expect(result['startingMaterials.mat-1.amount']).toBe(false);
      expect(result['startingMaterials.mat-1.mass']).toBe(true);
    });

    it('defaults to true when hide is not set on a nested group leaf', () => {
      const result = getEntryVisibility(columnDefinitions);
      expect(result['startingMaterials.mat-1.equivalent']).toBe(true);
    });

    it('does not include non-nested column groups', () => {
      const result = getEntryVisibility(columnDefinitions);
      expect(Object.keys(result).some((k) => k.startsWith('properties.'))).toBe(false);
    });
  });

  describe('setEntryVisibility', () => {
    const columnDefinitions = [
      {
        groupId: 'startingMaterials',
        children: [
          {
            groupId: 'mat-1',
            children: [
              { entry: 'amount', colId: 'startingMaterials.mat-1.amount', hide: true },
            ]
          }
        ]
      }
    ];

    it('applies visibility from the map to matching leaf entries', () => {
      const result = setEntryVisibility(columnDefinitions, { 'startingMaterials.mat-1.amount': false });
      const leaf = result[0].children[0].children[0];
      expect(leaf.hide).toBe(false);
    });

    it('does not modify the original column definitions', () => {
      setEntryVisibility(columnDefinitions, { 'startingMaterials.mat-1.amount': false });
      expect(columnDefinitions[0].children[0].children[0].hide).toBe(true);
    });

    it('ignores keys not present in the map', () => {
      const result = setEntryVisibility(columnDefinitions, {});
      const leaf = result[0].children[0].children[0];
      expect(leaf.hide).toBe(true);
    });
  });

  describe('getEntryDisplayUnits', () => {
    const columnDefinitions = [
      {
        groupId: 'properties',
        children: [
          { entry: 'temperature', colId: 'properties.temperature', displayUnit: 'K' },
          { entry: 'duration', colId: 'properties.duration' },
        ]
      },
      {
        groupId: 'startingMaterials',
        children: [
          {
            groupId: 'mat-1',
            children: [
              { entry: 'amount', colId: 'startingMaterials.mat-1.amount', displayUnit: 'mmol' },
            ]
          }
        ]
      }
    ];

    it('collects displayUnit for all leaf entries that have one', () => {
      const result = getEntryDisplayUnits(columnDefinitions);
      expect(result['properties.temperature']).toBe('K');
      expect(result['startingMaterials.mat-1.amount']).toBe('mmol');
    });

    it('omits leaf entries without a displayUnit', () => {
      const result = getEntryDisplayUnits(columnDefinitions);
      expect('properties.duration' in result).toBe(false);
    });
  });

  describe('setEntryDisplayUnits', () => {
    const columnDefinitions = [
      {
        groupId: 'properties',
        children: [
          { entry: 'temperature', colId: 'properties.temperature', displayUnit: '°C' },
        ]
      }
    ];

    it('applies displayUnit from the map to matching leaf entries', () => {
      const result = setEntryDisplayUnits(columnDefinitions, { 'properties.temperature': 'K' });
      expect(result[0].children[0].displayUnit).toBe('K');
    });

    it('does not modify the original column definitions', () => {
      setEntryDisplayUnits(columnDefinitions, { 'properties.temperature': 'K' });
      expect(columnDefinitions[0].children[0].displayUnit).toBe('°C');
    });

    it('ignores keys not present in the map', () => {
      const result = setEntryDisplayUnits(columnDefinitions, {});
      expect(result[0].children[0].displayUnit).toBe('°C');
    });
  });

  describe('getGroupHeaderNames', () => {
    const columnDefinitions = [
      {
        groupId: 'startingMaterials',
        children: [
          { groupId: 'mat-1', headerName: 'Water', children: [] },
          { groupId: 'mat-2', headerName: 'Ethanol', children: [] },
        ]
      },
      {
        groupId: 'properties',
        children: [
          { groupId: 'temperature', headerName: 'T' },
        ]
      }
    ];

    it('returns header names keyed by groupId.subGroupId for nested column groups', () => {
      const result = getGroupHeaderNames(columnDefinitions);
      expect(result['startingMaterials.mat-1']).toBe('Water');
      expect(result['startingMaterials.mat-2']).toBe('Ethanol');
    });

    it('does not include non-nested column groups', () => {
      const result = getGroupHeaderNames(columnDefinitions);
      expect('properties.temperature' in result).toBe(false);
    });
  });

  describe('setGroupHeaderNames', () => {
    const columnDefinitions = [
      {
        groupId: 'startingMaterials',
        children: [
          { groupId: 'mat-1', headerName: 'Water', children: [] },
        ]
      }
    ];

    it('applies header names from the map to matching subgroups', () => {
      const result = setGroupHeaderNames(columnDefinitions, { 'startingMaterials.mat-1': 'H2O' });
      expect(result[0].children[0].headerName).toBe('H2O');
    });

    it('does not modify the original column definitions', () => {
      setGroupHeaderNames(columnDefinitions, { 'startingMaterials.mat-1': 'H2O' });
      expect(columnDefinitions[0].children[0].headerName).toBe('Water');
    });

    it('ignores keys not present in the map', () => {
      const result = setGroupHeaderNames(columnDefinitions, {});
      expect(result[0].children[0].headerName).toBe('Water');
    });
  });

  describe('getLayout', () => {
    it('returns entries, displayUnits, and groupHeaderNames', () => {
      const columnDefinitions = [
        {
          groupId: 'startingMaterials',
          children: [
            {
              groupId: 'mat-1',
              headerName: 'Water',
              children: [
                {
                  entry: 'amount', colId: 'startingMaterials.mat-1.amount', hide: false, displayUnit: 'mmol'
                },
              ]
            }
          ]
        }
      ];

      const layout = getLayout(columnDefinitions);
      expect(layout.entries).toEqual({ 'startingMaterials.mat-1.amount': false });
      expect(layout.displayUnits).toEqual({ 'startingMaterials.mat-1.amount': 'mmol' });
      expect(layout.groupHeaderNames).toEqual({ 'startingMaterials.mat-1': 'Water' });
    });
  });

  describe('setLayout', () => {
    let userStoreStub;

    beforeEach(() => {
      userStoreStub = sinon.stub(UserStore, 'getState').returns({ currentUser: { id: 7 } });
    });

    afterEach(() => {
      userStoreStub.restore();
      localStorage.clear();
    });

    it('applies entries, displayUnits, and groupHeaderNames', () => {
      const columnDefinitions = [
        {
          groupId: 'startingMaterials',
          children: [
            {
              groupId: 'mat-1',
              headerName: 'Water',
              children: [
                {
                  entry: 'amount', colId: 'startingMaterials.mat-1.amount', hide: true, displayUnit: 'mol'
                },
              ]
            }
          ]
        }
      ];

      const layout = {
        entries: { 'startingMaterials.mat-1.amount': false },
        displayUnits: { 'startingMaterials.mat-1.amount': 'mmol' },
        groupHeaderNames: { 'startingMaterials.mat-1': 'H2O' },
      };
      localStorage.setItem('user7-reaction42-reactionVariationsLayout', JSON.stringify(layout));

      const result = setLayout(42, columnDefinitions);
      const subGroup = result[0].children[0];
      const leaf = subGroup.children[0];
      expect(leaf.hide).toBe(false);
      expect(leaf.displayUnit).toBe('mmol');
      expect(subGroup.headerName).toBe('H2O');
    });

    it('handles a partial layout gracefully', () => {
      const columnDefinitions = [
        {
          groupId: 'startingMaterials',
          children: [
            {
              groupId: 'mat-1',
              headerName: 'Water',
              children: [
                {
                  entry: 'amount', colId: 'startingMaterials.mat-1.amount', hide: true, displayUnit: 'mol'
                },
              ]
            }
          ]
        }
      ];

      const result = setLayout(42, columnDefinitions);
      const leaf = result[0].children[0].children[0];
      expect(leaf.hide).toBe(true);
      expect(leaf.displayUnit).toBe('mol');
    });

    it('does not modify the original column definitions', () => {
      const columnDefinitions = [
        {
          groupId: 'startingMaterials',
          children: [
            {
              groupId: 'mat-1',
              headerName: 'Water',
              children: [
                {
                  entry: 'amount', colId: 'startingMaterials.mat-1.amount', hide: true, displayUnit: 'mol'
                },
              ]
            }
          ]
        }
      ];

      const layout = {
        entries: { 'startingMaterials.mat-1.amount': false },
        displayUnits: { 'startingMaterials.mat-1.amount': 'mmol' },
        groupHeaderNames: { 'startingMaterials.mat-1': 'H2O' },
      };
      localStorage.setItem('user7-reaction42-reactionVariationsLayout', JSON.stringify(layout));

      setLayout(42, columnDefinitions);

      expect(columnDefinitions[0].children[0].children[0].hide).toBe(true);
      expect(columnDefinitions[0].children[0].children[0].displayUnit).toBe('mol');
      expect(columnDefinitions[0].children[0].headerName).toBe('Water');
    });
  });
});

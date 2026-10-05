import expect from 'expect';
import ReactionFactory from 'factories/ReactionFactory';
import ReactionUpdateHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
import {
  isGasProductMaterial, schemaBuildColumnGroups, switchRowToUnit
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationSchemaComponents';

/*
The scheme half of the variations grid: what becomes a column, and what each column's valueGetter -
the value sorting and the CSV export run on - reads off a variation.
*/
describe('ReactionVariationSchemaComponents', () => {
  const buildVariations = async () => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    return [{
      idx: 0, label: 1, group: [1, 0], data: reaction
    }];
  };

  const groupOf = (groups, groupId) => groups.find((group) => group.groupId === groupId);
  const columnOf = (groups, groupId, colId) => groupOf(groups, groupId)
    ?.columns.find((column) => column.colId === colId);

  describe('isGasProductMaterial', () => {
    it('requires a gaseous reaction and a gas-typed material', () => {
      expect(isGasProductMaterial({ gaseous: true }, { gas_type: 'gas' })).toBe(true);
      expect(isGasProductMaterial({ gaseous: false }, { gas_type: 'gas' })).toBe(false);
      expect(isGasProductMaterial({ gaseous: true }, { gas_type: 'catalyst' })).toBe(false);
      expect(isGasProductMaterial(null, null)).toBe(false);
    });
  });

  /*
  A row added after a column's unit was switched from its header is brought to that unit, through the
  handler calls the header makes.
  */
  describe('switchRowToUnit', () => {
    const getRowHandler = (variation) => new ReactionUpdateHandler({
      reaction: variation.data,
      onReactionChange: () => {},
      onLockEquivColChange: () => {},
    });
    const massColumn = (variations) => columnOf(
      schemaBuildColumnGroups(variations),
      'starting_materials::0',
      'starting_materials_0_mass'
    ).headerComponentParams;
    const massPrefixOf = (variation) => variation.data.starting_materials[0].metrics[0];

    it('switches the mass of the row to the column unit, keeping the amount', async () => {
      const variations = await buildVariations();
      const [row] = variations;
      const target = massPrefixOf(row) === 'm' ? 'n' : 'm';
      const amountG = row.data.starting_materials[0].amount_g;

      switchRowToUnit(row, getRowHandler, massColumn(variations), target);

      expect(massPrefixOf(row)).toBe(target);
      expect(row.data.starting_materials[0].amount_g).toBeCloseTo(amountG, 9);
    });

    it('leaves a row alone that is already in the column unit', async () => {
      const variations = await buildVariations();
      const [row] = variations;
      let calls = 0;
      const countingHandler = (variation) => {
        calls += 1;
        return getRowHandler(variation);
      };

      switchRowToUnit(row, countingHandler, massColumn(variations), massPrefixOf(row));

      expect(calls).toBe(0);
    });

    it('leaves a row alone that does not have the material', async () => {
      const variations = await buildVariations();
      const column = massColumn(variations);
      const row = { idx: 1, data: { starting_materials: [] } };

      expect(() => switchRowToUnit(row, getRowHandler, column, 'n')).not.toThrow();
    });
  });

  // Cells that cannot be edited get the grey background of the previous variations table.
  describe('read-only cells', () => {
    const READ_ONLY = 'variations-cell--read-only';
    const isGrey = (groups, groupId, colId, row) => columnOf(groups, groupId, colId)
      .cellClassRules[READ_ONLY]({ data: row });

    const buildEditable = async () => {
      const variations = await buildVariations();
      variations[0].data.can_update = true;
      return variations;
    };

    it('leaves editable fields white and greys computed or only shown ones', async () => {
      const variations = await buildEditable();
      const groups = schemaBuildColumnGroups(variations);

      expect(isGrey(groups, 'starting_materials::0', 'starting_materials_0_mass', variations[0])).toBe(false);
      expect(isGrey(groups, 'starting_materials::0', 'starting_materials_0_density', variations[0])).toBe(true);
      expect(isGrey(groups, 'starting_materials::0', 'starting_materials_0_molar_mass', variations[0])).toBe(true);
    });

    it('greys a product yield, which is computed, and the reference material equivalent', async () => {
      const variations = await buildEditable();
      variations[0].data.starting_materials[0].reference = true;
      const groups = schemaBuildColumnGroups(variations);

      expect(isGrey(groups, 'products::0', 'products_0_eq', variations[0])).toBe(true);
      expect(isGrey(groups, 'starting_materials::0', 'starting_materials_0_eq', variations[0])).toBe(true);
      expect(isGrey(groups, 'starting_materials::1', 'starting_materials_1_eq', variations[0])).toBe(false);
    });

    it('greys every cell of a row the user may not change, but not the material name', async () => {
      const variations = await buildVariations();
      variations[0].data.can_update = false;
      const groups = schemaBuildColumnGroups(variations);

      expect(isGrey(groups, 'starting_materials::0', 'starting_materials_0_mass', variations[0])).toBe(true);
      expect(isGrey(groups, 'starting_materials::0', 'starting_materials_0_name', variations[0])).toBe(false);
      expect(isGrey(groups, 'reaction_fields', 'reaction_temperature', variations[0])).toBe(true);
    });

    it('greys a slot this variation leaves empty', async () => {
      const variations = await buildEditable();
      const wider = await buildEditable();
      wider[0].data.starting_materials = [...wider[0].data.starting_materials, wider[0].data.products[0]];
      const groups = schemaBuildColumnGroups([...variations, { ...wider[0], idx: 1 }]);

      expect(isGrey(groups, 'starting_materials::2', 'starting_materials_2_mass', variations[0])).toBe(true);
    });
  });

  describe('schemaBuildColumnGroups', () => {
    it('builds one group per material slot, sized by the widest variation', async () => {
      const variations = await buildVariations();
      const groups = schemaBuildColumnGroups(variations);

      expect(groupOf(groups, 'starting_materials::0').headerName).toBe('Starting material 1');
      expect(groupOf(groups, 'starting_materials::1').headerName).toBe('Starting material 2');
      expect(groupOf(groups, 'products::1')).toBeTruthy();
      // The factory reaction has no reactants or solvents, so no slots exist for them.
      expect(groupOf(groups, 'reactants::0')).toBe(undefined);
      expect(groupOf(groups, 'solvents::0')).toBe(undefined);
    });

    it('closes with the reaction-level fields', async () => {
      const groups = schemaBuildColumnGroups(await buildVariations());
      expect(groups[groups.length - 1].groupId).toBe('reaction_fields');
    });

    it('reads the mass sort value in grams, whatever the display unit', async () => {
      const variations = await buildVariations();
      const groups = schemaBuildColumnGroups(variations);
      const massColumn = columnOf(groups, 'starting_materials::0', 'starting_materials_0_mass');

      expect(massColumn.valueGetter({ data: variations[0] })).toBeCloseTo(100, 6);
      expect(massColumn.context.exportUnit).toBe('g');
    });

    it('reads an empty slot as null rather than throwing', async () => {
      const variations = await buildVariations();
      // A second variation with one starting material fewer than the widest one.
      variations.push({
        idx: 1, label: 2, group: [2, 0], data: await ReactionFactory.build('ReactionFactory.water+water=>water+water')
      });
      variations[1].data.starting_materials = variations[1].data.starting_materials.slice(0, 1);

      const groups = schemaBuildColumnGroups(variations);
      const massColumn = columnOf(groups, 'starting_materials::1', 'starting_materials_1_mass');
      expect(massColumn.valueGetter({ data: variations[1] })).toBe(null);
    });

    it('turns sorting off for the rich text fields only', async () => {
      const groups = schemaBuildColumnGroups(await buildVariations());
      const reactionColumns = groupOf(groups, 'reaction_fields').columns;

      const sortableOf = (colId) => reactionColumns.find((column) => column.colId === colId).sortable;
      expect(sortableOf('reaction_description')).toBe(false);
      expect(sortableOf('reaction_observation')).toBe(false);
      expect(reactionColumns.find((column) => column.colId === 'reaction_ph').sortable).toBe(undefined);
    });

    it('reads the temperature sort value in Kelvin', async () => {
      const variations = await buildVariations();
      variations[0].data.temperature.userText = '25';
      const groups = schemaBuildColumnGroups(variations);
      const temperatureColumn = columnOf(groups, 'reaction_fields', 'reaction_temperature');

      expect(temperatureColumn.valueGetter({ data: variations[0] })).toBeCloseTo(298.15, 3);
    });

    it('drops a free text temperature out of the sort order', async () => {
      const variations = await buildVariations();
      variations[0].data.temperature.userText = 'reflux';
      const groups = schemaBuildColumnGroups(variations);
      const temperatureColumn = columnOf(groups, 'reaction_fields', 'reaction_temperature');

      expect(temperatureColumn.valueGetter({ data: variations[0] })).toBe(null);
    });

    describe('with a gaseous product', () => {
      const buildGasVariations = async () => {
        const variations = await buildVariations();
        const reaction = variations[0].data;
        reaction.gaseous = true;
        reaction.products[0].gas_type = 'gas';
        reaction.products[0].gas_phase_data = {
          time: { unit: 'm', value: 30 },
          temperature: { unit: '°C', value: 25 },
          part_per_million: 10000,
          turnover_number: 12,
          turnover_frequency: { unit: 'TON/m', value: 2 },
        };
        return variations;
      };

      it('adds the gas phase columns to that product slot only', async () => {
        const groups = schemaBuildColumnGroups(await buildGasVariations());
        expect(columnOf(groups, 'products::0', 'products_0_gas_ppm')).toBeTruthy();
        expect(columnOf(groups, 'products::1', 'products_1_gas_ppm')).toBe(undefined);
        expect(columnOf(groups, 'starting_materials::0', 'starting_materials_0_gas_ppm')).toBe(undefined);
      });

      // ppm is stored as a bare number, unlike time and temperature - this pins the regression
      // where reading `{ value, unit }` off it sorted every row as empty.
      it('reads the bare ppm number', async () => {
        const variations = await buildGasVariations();
        const groups = schemaBuildColumnGroups(variations);
        const ppmColumn = columnOf(groups, 'products::0', 'products_0_gas_ppm');
        expect(ppmColumn.valueGetter({ data: variations[0] })).toBe(10000);
      });

      it('normalizes gas time to hours and gas temperature to Kelvin', async () => {
        const variations = await buildGasVariations();
        const groups = schemaBuildColumnGroups(variations);

        const timeColumn = columnOf(groups, 'products::0', 'products_0_gas_time');
        const temperatureColumn = columnOf(groups, 'products::0', 'products_0_gas_temperature');
        expect(timeColumn.valueGetter({ data: variations[0] })).toBeCloseTo(0.5, 6);
        expect(temperatureColumn.valueGetter({ data: variations[0] })).toBeCloseTo(298.15, 3);
      });

      // Derived and read-only, but what gas phase variations are compared by.
      it('shows turnover number and frequency, the frequency per hour', async () => {
        const variations = await buildGasVariations();
        const groups = schemaBuildColumnGroups(variations);

        const tonColumn = columnOf(groups, 'products::0', 'products_0_gas_ton');
        const tofColumn = columnOf(groups, 'products::0', 'products_0_gas_tof');
        expect(tonColumn.valueGetter({ data: variations[0] })).toBe(12);
        expect(tofColumn.valueGetter({ data: variations[0] })).toBeCloseTo(120, 6);
        expect(tofColumn.context.exportUnit).toBe('TON/h');
      });
    });
  });
});

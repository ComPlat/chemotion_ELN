import expect from 'expect';
import ReactionFactory from 'factories/ReactionFactory';
import {
  isGasProductMaterial, schemaBuildColumnGroups
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
    });
  });
});

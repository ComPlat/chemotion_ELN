/* global describe, it */
import expect from 'expect';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';
import 'src/apps/mydb/elements/details/samples/propertiesTab/SampleForm';

// Target 5 g and Real 6.013 g, components stored at the Target mass: 10 and 20 mmol, relative MW 500 / 250.
describe('Sample Target/Real amount mode cycle', () => {
  const serialize = (sample) => {
    const payload = JSON.parse(JSON.stringify(sample.serializeMaterial()));
    payload.components.forEach((entry, index) => {
      entry.component_properties.molecule = sample.components[index].molecule;
    });
    return payload;
  };
  const initialPayload = () => {
    const sample = new Sample({
      id: 77, sample_type: 'Mixture', amountType: 'target',
      target_amount_value: 5, target_amount_unit: 'g', real_amount_value: 6.013, real_amount_unit: 'g',
      sample_details: {
        total_mixture_volume_l: 0, total_mixture_mass_g: 5, reaction_amount_input_units: { target: 'g', real: 'g' },
      },
    });
    sample.initialComponents([
      new Component({
        id: 1, position: 0, reference: true, material_group: 'solid', equivalent: 1, amount_mol: 0.01,
        relative_molecular_weight: 500, purity: 1, density: 0, molecule: { molecular_weight: 100 },
      }),
      new Component({
        id: 2, position: 1, material_group: 'solid', equivalent: 2, amount_mol: 0.02,
        relative_molecular_weight: 250, purity: 1, density: 0, molecule: { molecular_weight: 100 },
      }),
    ]);
    sample.components.forEach((component) => component.updatePhysicalAmounts());
    return serialize(sample);
  };
  const open = (payload, amountType) => {
    const sample = new Sample(payload);
    sample.amountType = amountType;
    sample.initialComponents(payload.components.map(Component.deserializeData));
    sample.syncMixtureComponentAmounts();
    sample.updateMixtureComponentEquivalent({ preserveZeroRatios: true });
    return sample;
  };
  const state = (sample) => ({
    headerG: sample.amount_g,
    headerMol: sample.amount_mol,
    mmol: sample.components.map((component) => component.amount_mol * 1000),
    ratios: sample.components.map((component) => Number(component.equivalent)),
    relativeMw: sample.components.map((component) => component.relative_molecular_weight),
    target: sample.target_amount_value,
    real: sample.real_amount_value,
  });

  const expectState = (actual, mode) => {
    const real = mode === 'real';
    expect(actual.headerG).toBeCloseTo(real ? 6.013 : 5, 12);
    expect(actual.headerMol).toBeCloseTo(real ? 0.012026 : 0.01, 12);
    actual.mmol.forEach((value, index) => expect(value).toBeCloseTo((real ? 1.2026 : 1) * [10, 20][index], 9));
    expect(actual.ratios).toEqual([1, 2]);
    expect(actual.relativeMw).toEqual([500, 250]);
    expect(actual.target).toBe(5);
    expect(actual.real).toBe(6.013);
  };

  ['target', 'real'].forEach((saveMode) => {
    it(`keeps masses, ratios, relative MW and yield after a ${saveMode} save and reopening both modes`, () => {
      const saved = serialize(open(initialPayload(), saveMode));

      expectState(state(open(saved, 'target')), 'target');
      expectState(state(open(saved, 'real')), 'real');
    });
  });

  it('stores the component amounts of the mode that was saved last', () => {
    const initial = initialPayload();
    const inTarget = serialize(open(initial, 'target'));
    const inReal = serialize(open(initial, 'real'));
    const moles = (payload) => payload.components.map((entry) => entry.component_properties.amount_mol);

    expect(moles(inTarget)[0]).toBeCloseTo(0.01, 12);
    expect(moles(inReal)[0]).toBeCloseTo(0.012026, 12);
  });
});

/* global describe, it, beforeEach */
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import SampleForm from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleForm';
import SampleFactory from 'factories/SampleFactory';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';
import Reaction from 'src/models/Reaction';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';

configure({ adapter: new Adapter() });

const buildInstance = (sample) => {
  const instance = new SampleForm({
    sample,
    handleSampleChanged: () => {},
    showStructureEditor: () => {},
    customizableField: () => {},
    decoupleMolecule: () => {},
  });
  // isolate from the heavy real implementation so we only assert the input wiring
  instance.handleFieldChanged = sinon.spy();
  return instance;
};

const findControl = (wrapper) => wrapper.find('FormControl');

describe('SampleForm fixed product Total volume', () => {
  const build = (amountType = 'real', group = 'products') => {
    const sample = new Sample({
      id: 'product', sample_type: 'Mixture', amountType, amount_value: 10, amount_unit: 'g', can_update: true,
      sample_details: {
        total_mixture_mass_g: 10, total_mixture_volume_l: 0, reaction_amount_input_units: { [amountType]: 'g' },
      },
    });
    sample.initialComponents([180.16, 122.12].map((weight, index) => new Component({
      id: `component-${index}`, position: index, reference: index === 0, material_group: 'solid', purity: 1,
      molecule: { molecular_weight: weight }, equivalent: index === 0 ? 1 : 3,
      amount_mol: 10 * (index === 0 ? 1 : 3) / 546.52,
    })));
    sample.components.forEach((component) => component.updatePhysicalAmounts());
    sample.calculateRelativeMolecularWeightsForComponents();
    sample.belongTo = new Reaction({ type: 'reaction', [group]: [sample] });
    const form = buildInstance(sample);
    const notifications = [];
    form.context = { notifications: { add: (notice) => notifications.push(notice) } };
    return { sample, form, notifications };
  };
  const enterVolume = (form, sample, volumeL) => form.totalMixtureVolume(sample).props.onChange({
    value: volumeL, unit: 'l',
  });

  ['target', 'real'].forEach((amountType) => {
    it(`keeps 10 g through ${amountType} volume edits, subsequent ratios, clearing and reopening`, () => {
      const { sample, form, notifications } = build(amountType);
      [0.005, 0.002, 0].forEach((volumeL) => {
        enterVolume(form, sample, volumeL);
        expect(sample.amount_g).toBe(10);
        expect(sample.amount_unit).toBe('g');
        expect(sample.total_mixture_volume_l).toBe(volumeL);
        expect(sample.hasFixedProductMass()).toBe(true);
        expect(sample.components.reduce((sum, component) => sum + component.amount_g, 0))
          .toBeCloseTo(10 - volumeL * 1000, 12);

        [1, 3].forEach((ratio) => {
          sample.updateComponentRatio(sample.components[1], ratio, 'solid');
          expect(sample.amount_g).toBe(10);
          expect(sample.components[0].amount_mol)
            .toBeCloseTo((10 - volumeL * 1000) / (180.16 + ratio * 122.12), 12);
          sample.calculateTotalMixtureMass();
          expect(sample.amount_g).toBeCloseTo(10, 12);
        });
      });
      expect(sample.components[0].amount_mol).toBeCloseTo(10 / 546.52, 12);
      expect(notifications).toEqual([]);

      enterVolume(form, sample, 0.005);
      sample.prepareMixtureForSave();
      const payload = JSON.parse(JSON.stringify(sample.serializeMaterial()));
      payload.components.forEach((entry, index) => {
        entry.component_properties.molecule = sample.components[index].molecule;
      });
      const reopened = new Sample(payload);
      reopened.initialComponents(payload.components.map(Component.deserializeData));
      reopened.belongTo = sample.belongTo;
      reopened.updateComponentRatio(reopened.components[1], 1, 'solid');
      expect(reopened.amount_g).toBe(10);
      expect(reopened.amount_unit).toBe('g');
      expect(reopened.total_mixture_volume_l).toBe(0.005);
      expect(reopened.components[0].amount_mol).toBeCloseTo(5 / 302.28, 12);
    });
  });

  it('warns and preserves all quantities when 15 ml cannot fit within 10 g', () => {
    const { sample, form, notifications } = build();
    enterVolume(form, sample, 0.005);
    const before = JSON.stringify(sample.serializeMaterial());
    enterVolume(form, sample, 0.015);
    expect(JSON.stringify(sample.serializeMaterial())).toBe(before);
    expect(form.totalMixtureVolume(sample).props.value).toBe(0.005);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].level).toBe('warning');
    expect(notifications[0].message).toContain('fixed product mass');
    sample.updateComponentRatio(sample.components[1], 1, 'solid');
    expect(sample.amount_g).toBe(10);
    expect(sample.components[0].amount_mol).toBeCloseTo(5 / 302.28, 12);
  });

  ['target', 'real'].forEach((amountType) => {
    it(`rejects a ${amountType} volume that leaves no component mass, preserving quantities and later edits`, () => {
      const { sample, form, notifications } = build(amountType);
      enterVolume(form, sample, 0.005);
      const before = JSON.stringify(sample.serializeMaterial());
      enterVolume(form, sample, 0.01);
      expect(JSON.stringify(sample.serializeMaterial())).toBe(before);
      expect(form.totalMixtureVolume(sample).props.value).toBe(0.005);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('warning');
      expect(notifications[0].message).toContain('no mass for the components');
      sample.updateComponentRatio(sample.components[1], 1, 'solid');
      expect(sample.amount_g).toBe(10);
      expect(sample.components[0].amount_mol).toBeCloseTo(5 / 302.28, 12);
      enterVolume(form, sample, 0);
      expect(sample.amount_g).toBe(10);
      expect(sample.components[0].amount_mol).toBeCloseTo(10 / 302.28, 12);
    });
  });

  it('rejects the zero-component boundary despite floating-point roundoff in the product mass', () => {
    const { sample, form, notifications } = build();
    sample.amount_value = 10 + 2 * Number.EPSILON * 10;
    const before = JSON.stringify(sample.serializeMaterial());
    enterVolume(form, sample, 0.01);
    expect(JSON.stringify(sample.serializeMaterial())).toBe(before);
    expect(notifications).toHaveLength(1);
  });

  it('updates locked concentrations to match an explicitly entered volume while preserving mass and ratios', () => {
    const { sample, form } = build();
    const lock = sinon.stub(ComponentStore, 'getState').returns({ lockedComponents: ['component-1'] });
    try {
      sample.components[1].concn = 5;
      enterVolume(form, sample, 0.005);
      expect(sample.amount_g).toBe(10);
      expect(sample.components[1].equivalent).toBe(3);
      expect(sample.components[1].concn).toBeCloseTo(sample.components[1].amount_mol / 0.005, 12);
    } finally {
      lock.restore();
    }
  });

  it('retains volume-based quantities for a reactant mixture', () => {
    const { sample, form, notifications } = build('real', 'reactants');
    enterVolume(form, sample, 0.005);
    expect(sample.amount_g).toBeCloseTo(15, 12);
    expect(sample.amount_unit).toBe('l');
    expect(notifications).toEqual([]);
  });

  it('reserves internal solvent mass again when Total volume is cleared', () => {
    const { sample, form, notifications } = build();
    sample.solvent = [{ amount_l: 0.002, density: 1 }];
    enterVolume(form, sample, 0.005);
    sample.updateComponentRatio(sample.components[1], 1, 'solid');
    enterVolume(form, sample, 0);
    expect(sample.amount_g).toBe(10);
    expect(sample.components[0].amount_mol).toBeCloseTo(8 / 302.28, 12);
    expect(sample.solvent[0].amount_l).toBe(0.002);
    sample.calculateTotalMixtureMass();
    expect(sample.amount_g).toBeCloseTo(10, 12);
    expect(notifications).toEqual([]);
  });
});

describe('SampleForm new property inputs', () => {
  let sample;
  let instance;
  let notificationCalls;

  beforeEach(async () => {
    notificationCalls = [];
    sample = await SampleFactory.build('empty');
    sample.can_update = true;
    sample.xref = {};
    instance = buildInstance(sample);
    // SampleForm uses this.context.notifications (legacy React context).
    // Set it manually since the instance is created directly, not via mount/shallow.
    instance.context = { notifications: { add: (n) => notificationCalls.push(n) } };
  });

  describe('mixture volume and density display', () => {
    it('does not display a mass-derived volume or inherited density when no total volume is stored', () => {
      sample.sample_type = 'Mixture';
      sample.amount_value = 7.256;
      sample.amount_unit = 'g';
      sample.density = 0.864;
      sample.sample_details = {};
      const checksum = sample.checksum();

      expect(instance.totalMixtureVolume(sample).props.value).toBe(0);
      expect(instance.totalMixtureDensity(sample).props.children.props.value).toBe(null);
      expect(sample.checksum()).toBe(checksum);
      expect(sample.density).toBe(0.864);
      expect(sample.sample_details.total_mixture_volume_l).toBeUndefined();
    });

    it('displays an explicitly entered total volume and its density', () => {
      sample.sample_type = 'Mixture';
      sample.density = 1.18;
      sample.sample_details = { total_mixture_volume_l: 0.01 };

      expect(instance.totalMixtureVolume(sample).props.value).toBe(0.01);
      expect(instance.totalMixtureDensity(sample).props.children.props.value).toBe(1.18);
    });

    it('keeps an explicit zero volume ahead of a stored quantity in liters', () => {
      sample.sample_type = 'Mixture';
      sample.amount_value = 0.01;
      sample.amount_unit = 'l';
      sample.density = 1.18;
      sample.sample_details = { total_mixture_volume_l: 0 };

      expect(instance.totalMixtureVolume(sample).props.value).toBe(0);
      expect(instance.totalMixtureDensity(sample).props.children.props.value).toBe(null);
    });

    it('displays a quantity explicitly entered in liters when no separate total volume was stored', () => {
      sample.sample_type = 'Mixture';
      sample.amount_value = 0.005;
      sample.amount_unit = 'l';
      sample.density = 2;
      sample.sample_details = {};

      expect(instance.totalMixtureVolume(sample).props.value).toBe(0.005);
      expect(instance.totalMixtureDensity(sample).props.children.props.value).toBe(2);
    });
  });

  describe('numericInputWithAddon', () => {
    it('stores the parsed value as typed without clamping (clamp is on blur)', () => {
      const wrapper = shallow(instance.numericInputWithAddon(sample, 'xref_moisture', 'Moisture', '%', 0, 100));
      findControl(wrapper).simulate('change', { target: { value: '150' } });
      expect(instance.handleFieldChanged.calledWith('xref_moisture', 150)).toEqual(true);
      expect(notificationCalls.length).toEqual(0);
    });

    it('stores decimal values and exposes step="any"', () => {
      const wrapper = shallow(instance.numericInputWithAddon(sample, 'xref_moisture', 'Moisture', '%', 0, 100));
      expect(findControl(wrapper).props().step).toEqual('any');
      findControl(wrapper).simulate('change', { target: { value: '12.5' } });
      expect(instance.handleFieldChanged.calledWith('xref_moisture', 12.5)).toEqual(true);
    });

    it('stores null for an empty input', () => {
      const wrapper = shallow(instance.numericInputWithAddon(sample, 'xref_moisture', 'Moisture', '%', 0, 100));
      findControl(wrapper).simulate('change', { target: { value: '' } });
      expect(instance.handleFieldChanged.calledWith('xref_moisture', null)).toEqual(true);
    });

    it('never stores NaN for intermediate/invalid input', () => {
      const wrapper = shallow(instance.numericInputWithAddon(sample, 'xref_moisture', 'Moisture', '%', 0, 100));
      findControl(wrapper).simulate('change', { target: { value: '-' } });
      expect(instance.handleFieldChanged.called).toEqual(false);
    });

    it('clamps to the max bound on blur and notifies', () => {
      const wrapper = shallow(instance.numericInputWithAddon(sample, 'xref_moisture', 'Moisture', '%', 0, 100));
      findControl(wrapper).simulate('blur', { target: { value: '150' } });
      expect(instance.handleFieldChanged.calledWith('xref_moisture', 100)).toEqual(true);
      expect(notificationCalls.length).toEqual(1);
    });

    it('clamps to the min bound on blur and notifies', () => {
      const wrapper = shallow(instance.numericInputWithAddon(sample, 'xref_particle_size', 'Particle size', 'µm', 0));
      findControl(wrapper).simulate('blur', { target: { value: '-5' } });
      expect(instance.handleFieldChanged.calledWith('xref_particle_size', 0)).toEqual(true);
      expect(notificationCalls.length).toEqual(1);
    });

    it('does not clamp or notify for an in-range value on blur', () => {
      const wrapper = shallow(instance.numericInputWithAddon(sample, 'xref_moisture', 'Moisture', '%', 0, 100));
      findControl(wrapper).simulate('blur', { target: { value: '42' } });
      expect(instance.handleFieldChanged.called).toEqual(false);
      expect(notificationCalls.length).toEqual(0);
    });
  });

  describe('moleculeInput', () => {
    const findMoleculeSelect = (wrapper) => wrapper.findWhere((n) => n.prop('name') === 'moleculeName');

    it('shows the assigned molecule name when it matches the current molecule', () => {
      sample.molecule = { id: 42 };
      sample.molecule_name = { label: 'Water', value: 5, mid: 42, desc: 'iupac_name' };
      const wrapper = shallow(instance.moleculeInput());
      expect(findMoleculeSelect(wrapper).props().value).toEqual({
        value: 5, label: 'Water', type: 'iupac_name',
      });
    });

    it('clears the field when the structure was redrawn (molecule id no longer matches)', () => {
      sample.molecule = { id: 42 };
      sample.molecule_name = { label: 'Water', value: 5, mid: 999, desc: 'iupac_name' };
      const wrapper = shallow(instance.moleculeInput());
      expect(findMoleculeSelect(wrapper).props().value).toBeNull();
    });

    it('keeps the value for a name just picked from the dropdown (option carries no mid)', () => {
      // updateMolName stores the raw react-select option, which has no `mid`;
      // that must not be mistaken for a structure redraw.
      sample.molecule = { id: 42 };
      sample.molecule_name = { label: 'Water', value: 5, type: 'iupac_name' };
      const wrapper = shallow(instance.moleculeInput());
      expect(findMoleculeSelect(wrapper).props().value).toEqual({
        value: 5, label: 'Water', type: 'iupac_name',
      });
    });

    it('shows no selected value when the sample has no assigned molecule name', () => {
      sample.molecule = { id: 42 };
      sample.molecule_name = {};
      const wrapper = shallow(instance.moleculeInput());
      expect(findMoleculeSelect(wrapper).props().value).toBeNull();
    });

    it('still shows the value for a disabled (read-only) select whose options never loaded', () => {
      // Read-only/disabled selects never fire onMenuOpen, so molecule_names (the
      // lazily-fetched plural options) stays unset; the value must still display.
      sample.molecule = { id: 42 };
      sample.molecule_name = { label: 'Water', value: 5, mid: 42, desc: 'iupac_name' };
      sample.molecule_names = undefined;
      sample.can_update = false;
      const wrapper = shallow(instance.moleculeInput());
      const select = findMoleculeSelect(wrapper);
      expect(select.props().isDisabled).toBe(true);
      expect(select.props().value).toEqual({ value: 5, label: 'Water', type: 'iupac_name' });
    });
  });

  describe('physicalStateInput', () => {
    const findSelect = (wrapper) => wrapper.findWhere((n) => n.prop('name') === 'physicalState');

    it('renders capitalized labels with lowercase values', () => {
      const wrapper = shallow(instance.physicalStateInput(sample));
      expect(findSelect(wrapper).props().options).toEqual([
        { label: 'Solid', value: 'solid' },
        { label: 'Liquid', value: 'liquid' },
        { label: 'Gas', value: 'gas' },
      ]);
    });

    it('reflects the current xref value as the selected option', () => {
      sample.xref = { physical_state: 'liquid' };
      const wrapper = shallow(instance.physicalStateInput(sample));
      expect(findSelect(wrapper).props().value).toEqual({ label: 'Liquid', value: 'liquid' });
    });

    it('stores the lowercase value on selection', () => {
      const wrapper = shallow(instance.physicalStateInput(sample));
      findSelect(wrapper).props().onChange({ label: 'Solid', value: 'solid' });
      expect(instance.handleFieldChanged.calledWith('xref_physical_state', 'solid')).toEqual(true);
    });

    it('stores null when cleared', () => {
      const wrapper = shallow(instance.physicalStateInput(sample));
      findSelect(wrapper).props().onChange(null);
      expect(instance.handleFieldChanged.calledWith('xref_physical_state', null)).toEqual(true);
    });
  });
});

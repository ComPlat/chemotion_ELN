import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import SampleForm from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleForm';
import SampleFactory from 'factories/SampleFactory';

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

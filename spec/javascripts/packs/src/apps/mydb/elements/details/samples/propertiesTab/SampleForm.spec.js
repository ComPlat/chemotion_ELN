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

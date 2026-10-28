import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import SampleForm from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleForm';
import SampleFactory from 'factories/SampleFactory';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';

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

describe('SampleForm MOF analysis', () => {
  let sample;
  let instance;
  let fetchMolecule;

  const deferred = () => {
    let resolve;
    const promise = new Promise((finish) => { resolve = finish; });
    return { promise, resolve };
  };

  beforeEach(async () => {
    sample = await SampleFactory.build('empty');
    sample.sample_type = 'MOF';
    sample.sample_details = { mof: { fragments: [{ smiles: 'C', ratio: 1 }] } };
    instance = buildInstance(sample);
    fetchMolecule = sinon.stub(MoleculesFetcher, 'fetchBySmi');
  });

  afterEach(() => sinon.restore());

  it('preserves user-entered fields on a new CIF analysis and replaces derived fields', () => {
    const userFields = {
      name: 'My framework', substrate: 'Glass', coating: 'Gold', dimensions: '2 x 3 mm',
      format_comments: 'Comment', defects: [{ defect_type: 'Vacancy', description: 'Missing linker' }],
    };
    sample.sample_details = { unrelated: true, mof: { ...userFields, mofkey: 'old', svg: 'unused.svg' } };
    sinon.stub(instance, 'resolveMofFragments');
    sinon.stub(instance, 'attachMofMolecule');
    instance.handleMofResult({ result: {
      mofid: 'C MOFid-v1.pcu.cat0.wrapper;new', mofkey: 'new', smiles_nodes: 'C', node_ratios: [3],
    } });
    expect(sample.sample_details.mof).toMatchObject({ ...userFields, mofkey: 'new' });
    expect(sample.sample_details.mof.fragments[0].ratio).toEqual(3);
    expect(sample.sample_details.mof.svg).toEqual(undefined);
    expect(sample.sample_details.unrelated).toEqual(true);
    sinon.assert.notCalled(fetchMolecule);
  });

  it('does not restore MOF data when a fragment lookup finishes after Clear', async () => {
    const lookup = deferred();
    fetchMolecule.returns(lookup.promise);
    const pending = instance.resolveMofFragments(sample);
    instance.handleMofResult({ result: null });
    lookup.resolve({ id: 1, iupac_name: 'methane' });
    await pending;
    expect(sample.sample_details.mof).toEqual(undefined);
  });

  it('keeps edited rows and metadata while enriching unchanged fragments', async () => {
    const lookup = deferred();
    fetchMolecule.returns(lookup.promise);
    const otherFragment = { smiles: 'O', ratio: 2 };
    sample.sample_details.mof.fragments.push(otherFragment);
    const pending = instance.resolveMofFragments(sample);
    const edited = { smiles: 'C', ratio: 6, iupac: 'User name' };
    sample.sample_details.mof = {
      ...sample.sample_details.mof, substrate: 'Glass', fragments: [edited, otherFragment],
    };
    lookup.resolve({ id: 1, iupac_name: 'Resolved name' });
    await pending;
    expect(sample.sample_details.mof.substrate).toEqual('Glass');
    expect(sample.sample_details.mof.fragments[0]).toEqual(edited);
    expect(sample.sample_details.mof.fragments[1].iupac).toEqual('Resolved name');
  });

  it('ignores fragment lookups from an earlier analysis', async () => {
    const lookup = deferred();
    fetchMolecule.returns(lookup.promise);
    const pending = instance.resolveMofFragments(sample);
    sinon.stub(instance, 'resolveMofFragments');
    sinon.stub(instance, 'attachMofMolecule');
    instance.handleMofResult({ result: { mofid: 'new', smiles_nodes: 'N' } });
    lookup.resolve({ id: 1, iupac_name: 'Old name' });
    await pending;
    expect(sample.sample_details.mof.mofid).toEqual('new');
    expect(sample.sample_details.mof.fragments[0].smiles).toEqual('N');
    expect(sample.sample_details.mof.fragments[0].iupac).toEqual('');
  });

  it('does not attach a molecule after the MOF result was cleared', async () => {
    const lookup = deferred();
    fetchMolecule.returns(lookup.promise);
    const originalMolecule = sample.molecule;
    const pending = instance.attachMofMolecule(sample);
    instance.handleMofResult({ result: null });
    lookup.resolve({ id: 1, molfile: 'old molfile' });
    await pending;
    expect(sample.molecule).toEqual(originalMolecule);
  });

  it('keeps the newest attached molecule when requests finish out of order', async () => {
    const oldLookup = deferred();
    const newLookup = deferred();
    fetchMolecule.onFirstCall().returns(oldLookup.promise);
    fetchMolecule.onSecondCall().returns(newLookup.promise);
    const first = instance.attachMofMolecule(sample);
    sample.sample_details.mof = { fragments: [{ smiles: 'N' }] };
    const second = instance.attachMofMolecule(sample);
    newLookup.resolve({ id: 2, molfile: 'new molfile' });
    await second;
    oldLookup.resolve({ id: 1, molfile: 'old molfile' });
    await first;
    expect(sample.molecule_id).toEqual(2);
    expect(sample.molfile).toEqual('new molfile');
  });

  it('ignores pending lookups after leaving the MOF sample type', async () => {
    const lookup = deferred();
    fetchMolecule.returns(lookup.promise);
    const pending = instance.resolveMofFragments(sample);
    sample.sample_type = 'Micromolecule';
    lookup.resolve({ id: 1, iupac_name: 'Old name' });
    await pending;
    expect(sample.sample_details.mof.fragments[0].iupac).toEqual(undefined);
  });

  it('ignores pending lookups after the form unmounts', async () => {
    const lookup = deferred();
    fetchMolecule.returns(lookup.promise);
    const pending = instance.resolveMofFragments(sample);
    instance.componentWillUnmount();
    lookup.resolve({ id: 1, iupac_name: 'Old name' });
    await pending;
    expect(sample.sample_details.mof.fragments[0].iupac).toEqual(undefined);
  });
});

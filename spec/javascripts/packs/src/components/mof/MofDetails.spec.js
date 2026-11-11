import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, mount, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import MofDetails from 'src/components/mof/MofDetails';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';

configure({ adapter: new Adapter() });

describe('MofDetails', () => {
  let mof;
  let onChange;
  let wrapper;

  beforeEach(() => {
    mof = {
      mofid: 'C MOFid-v1.pcu.cat0.mofidwrapper0.1.0;structure',
      fragments: [{ smiles: 'C', ratio: null }],
      format_id: 'MOFid-v1',
      topology: 'pcu',
      cat: 'cat0',
    };
    onChange = sinon.spy();
    wrapper = shallow(<MofDetails mof={mof} onChange={onChange} />);
  });

  afterEach(() => {
    wrapper.unmount();
    sinon.restore();
  });

  it('displays the full returned MOFid', () => {
    expect(wrapper.find('FormControl').filterWhere((node) => node.prop('readOnly')).prop('value'))
      .toEqual(mof.mofid);
  });

  it('shows unknown ratios as empty and preserves zero', () => {
    expect(wrapper.find('[aria-label="Fragment ratio"]').prop('value')).toEqual('');
    wrapper.setProps({ mof: { ...mof, fragments: [{ smiles: 'C', ratio: 0 }] } });
    expect(wrapper.find('[aria-label="Fragment ratio"]').prop('value')).toEqual(0);
  });

  it('stores a cleared ratio as unknown without changing the MOFid', () => {
    wrapper.find('[aria-label="Fragment ratio"]').simulate('change', { target: { value: '' } });
    expect(onChange.firstCall.args[0].fragments[0].ratio).toEqual(null);
    expect(onChange.firstCall.args[0].mofid).toEqual(mof.mofid);
  });

  it('accepts fractional ratios above one', () => {
    wrapper.find('[aria-label="Fragment ratio"]').simulate('change', { target: { value: '6.25' } });
    expect(onChange.firstCall.args[0].fragments[0].ratio).toEqual(6.25);
  });

  const resolveRow = (editor) => {
    editor.find('Button').filterWhere((node) => node.text() === 'SMILES').simulate('click');
    return editor.find('FormControl').filterWhere((node) => node.prop('placeholder') === 'SMILES').prop('onBlur')();
  };

  it('merges a completed row lookup into the latest metadata', async () => {
    wrapper.unmount();
    wrapper = mount(<MofDetails mof={mof} onChange={onChange} />);
    let finish;
    sinon.stub(MoleculesFetcher, 'fetchBySmi').returns(new Promise((resolve) => { finish = resolve; }));
    const pending = resolveRow(wrapper);
    wrapper.setProps({ mof: { ...mof, substrate: 'Glass' } });
    finish({ id: 1, iupac_name: 'methane' });
    await pending;
    expect(onChange.firstCall.args[0].substrate).toEqual('Glass');
    expect(onChange.firstCall.args[0].fragments[0].iupac).toEqual('methane');
    expect(onChange.firstCall.args[0].mofid).toEqual(mof.mofid);
  });

  it('ignores a row lookup if the fragment was edited while it was pending', async () => {
    wrapper.unmount();
    wrapper = mount(<MofDetails mof={mof} onChange={onChange} />);
    let finish;
    sinon.stub(MoleculesFetcher, 'fetchBySmi').returns(new Promise((resolve) => { finish = resolve; }));
    const pending = resolveRow(wrapper);
    wrapper.setProps({ mof: { ...mof, fragments: [{ smiles: 'N', ratio: 2 }] } });
    finish({ id: 1, iupac_name: 'methane' });
    await pending;
    sinon.assert.notCalled(onChange);
  });
});

import React from 'react';
import sinon from 'sinon';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import MofGenerator from 'src/components/mof/MofGenerator';
import Dropzone from 'src/components/common/Dropzone';
import MofFetcher from 'src/fetchers/MofFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';

configure({ adapter: new Adapter() });
const originalFileReader = global.FileReader;

describe('MofGenerator request lifecycle', () => {
  let wrapper;
  let onResult;
  let reader;
  let fetchMof;
  let finish;

  beforeEach(() => {
    sinon.stub(UIStore, 'getState').returns({ hasMof: true });
    global.FileReader = sinon.stub().callsFake(() => {
      reader = { result: 'data_test', readAsText: () => reader.onload() };
      return reader;
    });
    fetchMof = sinon.stub(MofFetcher, 'analyze').returns(new Promise((resolve) => { finish = resolve; }));
    onResult = sinon.spy();
    wrapper = mount(<MofGenerator onResult={onResult} />);
  });

  afterEach(() => {
    if (wrapper?.exists()) wrapper.unmount();
    if (originalFileReader === undefined) delete global.FileReader;
    else global.FileReader = originalFileReader;
    sinon.restore();
  });

  const dropFile = (editor) => editor.find(Dropzone).prop('onDropAccepted')([{ name: 'framework.cif' }]);

  it('persists a completed analysis with its filename', async () => {
    const pending = dropFile(wrapper);
    await Promise.resolve();
    finish({ mofid: 'generated identifier' });
    await pending;
    sinon.assert.calledWith(onResult, { result: { mofid: 'generated identifier', filename: 'framework.cif' } });
  });

  it('ignores a conversion that finishes after the panel unmounts', async () => {
    const pending = dropFile(wrapper);
    await Promise.resolve();
    sinon.assert.calledOnce(fetchMof);
    wrapper.unmount();
    finish({ mofid: 'stale identifier' });
    await pending;
    sinon.assert.notCalled(onResult);
  });

  it('does not start a conversion if the panel unmounts while the file is being read', async () => {
    global.FileReader.callsFake(() => {
      reader = { result: 'data_test', readAsText: () => {} };
      return reader;
    });
    const pending = dropFile(wrapper);
    wrapper.unmount();
    reader.onload();
    await pending;
    sinon.assert.notCalled(fetchMof);
    sinon.assert.notCalled(onResult);
  });

  it('ignores the previous sample conversion after switching to a different sample', async () => {
    const panel = (sampleId) => (
      <div><MofGenerator key={sampleId} onResult={onResult} /></div>
    );
    wrapper.unmount();
    wrapper = mount(panel('first'));
    const pending = dropFile(wrapper);
    await Promise.resolve();
    wrapper.setProps({ children: <MofGenerator key="second" onResult={onResult} /> });
    finish({ mofid: 'first sample identifier' });
    await pending;
    sinon.assert.notCalled(onResult);
  });

  it('starts only one analysis when two drops arrive before the handler updates', async () => {
    const onDrop = wrapper.find(Dropzone).prop('onDropAccepted');
    const pending = onDrop([{ name: 'first.cif' }]);
    await onDrop([{ name: 'second.cif' }]);
    sinon.assert.calledOnce(fetchMof);
    finish({ mofid: 'first sample identifier' });
    await pending;
    sinon.assert.calledOnce(onResult);
  });
});

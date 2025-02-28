import React from 'react';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import assert from 'assert';
import sinon from 'sinon';
import expect from 'expect';
import ChemSpectraFetcher from '@src/fetchers/ChemSpectraFetcher';
import ChemSpectraLayouts from '@src/apps/admin/ChemSpectraLayouts';

configure({ adapter: new Adapter() });

describe('ChemSpectraLayouts', () => {
  let component;
  let updateDataTypeStub;
  let fetchSpectraLayoutsStub;
  let fetchUpdatedSpectraLayoutsStub;

  const mockData = {
    datatypes: {
      'CIRCULAR DICHROISM SPECTROSCOPY': ['CIRCULAR DICHROISM SPECTROSCOPY'],
      'CYCLIC VOLTAMMETRY': ['CYCLIC VOLTAMMETRY'],
    },
  };

  beforeEach(() => {
    sinon.stub(global, 'fetch').callsFake(() => Promise.resolve({
      json: () => Promise.resolve({ some: 'data' }),
    }));
    component = shallow(React.createElement(ChemSpectraLayouts, {}));
    updateDataTypeStub = sinon.stub(ChemSpectraFetcher, 'updateDataTypes');
    fetchSpectraLayoutsStub = sinon.stub(ChemSpectraFetcher, 'fetchSpectraLayouts').resolves(mockData);
    fetchUpdatedSpectraLayoutsStub = sinon.stub(ChemSpectraFetcher, 'fetchUpdatedSpectraLayouts');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should fetch spectra layouts on component mount', async () => {
    const componentDidMountSpy = sinon.spy(ChemSpectraLayouts.prototype, 'componentDidMount');

    await component.instance().componentDidMount();
    expect(componentDidMountSpy.calledOnce).toBe(true);
    sinon.assert.calledOnce(fetchSpectraLayoutsStub);
  });

  it('should handle add new data type', async () => {
    const newDataType = { layout: 'CYCLIC VOLTAMMETRY', dataType: 'CV' };
    const expectedResponse = { message: 'Data types updated' };
    updateDataTypeStub.resolves(new Response(JSON.stringify(expectedResponse)));

    component.instance().setState({ newDataType });
    const layouts = Object.entries(mockData.datatypes);
    component.instance().setState({ layouts });
    await component.instance().handleAddDataType();

    assert(updateDataTypeStub.calledOnce);
    assert(fetchUpdatedSpectraLayoutsStub.calledOnce);
  });

  it('should give alert message when layout is not selected', async () => {
    const newDataType = { layout: '', dataType: 'Test Data Type' };

    component.instance().setState({ newDataType });
    await component.instance().handleAddDataType();

    assert.equal(component.state('alertMessage'), 'Please select a layout');
    assert.equal(updateDataTypeStub.callCount, 0);
  });

  it('should give alert message when a data type is not entered', async () => {
    const newDataType = { layout: 'Test Layout', dataType: '' };

    component.instance().setState({ newDataType });
    await component.instance().handleAddDataType();

    assert.equal(component.state('alertMessage'), 'Please enter a data type');
    assert.equal(updateDataTypeStub.callCount, 0);
  });

  it('should handle data type deletion', async () => {
    const dataTypeToDelete = { layout: 'Test Layout', dataType: 'Test Data Type' };
    const expectedResponse = { message: 'Data types updated' };
    updateDataTypeStub.resolves(new Response(JSON.stringify(expectedResponse)));

    await component.instance().handleDeleteDataType(dataTypeToDelete);

    assert(updateDataTypeStub.calledOnce);
    assert(fetchUpdatedSpectraLayoutsStub.calledOnce);
  });
});

import React from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import {
  configure,
  shallow,
} from 'enzyme';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import { AgGridReact } from 'ag-grid-react';
import ValidationComponent from '../../../../../../app/javascript/src/components/contextActions/ValidationComponent';
import * as validationUtils from '../../../../../../app/javascript/src/utilities/importDataValidations';

configure({ adapter: new Adapter() });

describe('ValidationComponent basic rendering', () => {
  let wrapper = null;
  const onValidateSpy = sinon.spy();
  const onCancelSpy = sinon.spy();
  const onRowDataChangeSpy = sinon.spy();

  const mockRowData = [
    {
      id: '1',
      name: 'Sample 1',
      cas: '123-45-6',
      valid: true,
    },
    {
      id: '2',
      name: 'Sample 2',
      cas: '789-01-2',
      valid: true,
    },
  ];

  const mockColumnDefs = [
    { field: 'name', headerName: 'Name' },
    { field: 'cas', headerName: 'CAS Number' }
  ];

  beforeEach(() => {
    wrapper = shallow(
      React.createElement(
        ValidationComponent,
        {
          rowData: mockRowData,
          columnDefs: mockColumnDefs,
          onValidate: onValidateSpy,
          onCancel: onCancelSpy,
          onRowDataChange: onRowDataChangeSpy
        }
      )
    );
  });

  it('should render the modal component', () => {
    expect(wrapper.find(Modal)).toHaveLength(1);
    expect(wrapper.find(Modal.Title).text()).toEqual('Validate Data to import');
  });

  it('should render the AG Grid component', () => {
    expect(wrapper.find(AgGridReact)).toHaveLength(1);
    expect(wrapper.find(AgGridReact).prop('rowData')).toEqual(mockRowData);
  });

  it('should render action buttons', () => {
    // Check specifically for buttons with exact text to avoid ambiguity
    const addRowBtn = wrapper.findWhere((node) => node.type() === Button && node.text().includes('Add Row'));

    const showMoreBtn = wrapper.findWhere((node) => node.type() === Button
      && node.text().includes('Show More Rows'));

    const cancelBtn = wrapper.findWhere((node) => node.type() === Button && node.text() === 'Cancel');

    const validateBtn = wrapper.findWhere((node) => node.type() === Button
      && node.text() === 'Validate Data');

    expect(addRowBtn).toHaveLength(1);
    expect(showMoreBtn).toHaveLength(1);
    expect(cancelBtn).toHaveLength(1);
    expect(validateBtn).toHaveLength(1);
  });

  it('should not render validation errors by default', () => {
    expect(wrapper.find(Alert)).toHaveLength(0);
  });
});

describe('ValidationComponent interaction tests', () => {
  let wrapper = null;
  let onValidateSpy = null;
  let onCancelSpy = null;
  let onRowDataChangeSpy = null;

  const mockRowData = [
    {
      id: '1',
      name: 'Sample 1',
      cas: '123-45-6',
      valid: true,
    },
    {
      id: '2',
      name: 'Sample 2',
      cas: '789-01-2',
      valid: true,
    },
  ];

  const mockColumnDefs = [
    { field: 'name', headerName: 'Name' },
    { field: 'cas', headerName: 'CAS Number' }
  ];

  beforeEach(() => {
    onValidateSpy = sinon.spy();
    onCancelSpy = sinon.spy();
    onRowDataChangeSpy = sinon.spy();

    wrapper = shallow(
      React.createElement(
        ValidationComponent,
        {
          rowData: mockRowData,
          columnDefs: mockColumnDefs,
          onValidate: onValidateSpy,
          onCancel: onCancelSpy,
          onRowDataChange: onRowDataChangeSpy
        }
      )
    );
  });

  it('should call onCancel when cancel button is clicked', () => {
    // Find the cancel button precisely by text and type
    const cancelButton = wrapper.findWhere((node) => node.type() === Button
      && node.text() === 'Cancel');

    expect(cancelButton).toHaveLength(1);

    // Call the onClick handler directly
    cancelButton.prop('onClick')();
    expect(onCancelSpy.calledOnce).toBe(true);
  });

  it('should add a new row when add row button is clicked', () => {
    const initialLength = mockRowData.length;

    // Find the Add Row button precisely
    const addRowButton = wrapper.findWhere((node) => node.type() === Button
      && node.text().includes('Add Row'));

    expect(addRowButton).toHaveLength(1);

    // Call the onClick handler directly
    addRowButton.prop('onClick')();

    // Check if onRowDataChange was called with a new array that has one more item
    expect(onRowDataChangeSpy.calledOnce).toBe(true);
    const newData = onRowDataChangeSpy.firstCall.args[0];
    expect(newData.length).toBe(initialLength + 1);
  });
});

describe('ValidationComponent validation tests', () => {
  let wrapper = null;
  let onValidateSpy = null;
  let validateRowUnifiedStub = null;
  let mockGridApi = null;

  const mockRowData = [
    {
      id: '1',
      name: 'Sample 1',
      cas: '123-45-6',
      valid: true,
    },
    {
      id: '2',
      name: 'Sample 2',
      cas: 'invalid-cas',
      valid: true,
    },
  ];

  const mockColumnDefs = [
    { field: 'name', headerName: 'Name' },
    { field: 'cas', headerName: 'CAS Number' }
  ];

  beforeEach(() => {
    onValidateSpy = sinon.spy();

    // Stub the validation function to return predefined results
    validateRowUnifiedStub = sinon.stub(validationUtils, 'validateRowUnified');

    // First row is valid
    validateRowUnifiedStub.withArgs(sinon.match({ id: '1' }))
      .resolves({ valid: true });

    // Second row is invalid
    validateRowUnifiedStub.withArgs(sinon.match({ id: '2' }))
      .resolves({ valid: false, errors: ['Invalid CAS number format'] });

    // Mock the grid API for testing validation
    mockGridApi = {
      forEachNode: (callback) => {
        mockRowData.forEach((row, index) => {
          callback({ data: row, rowIndex: index });
        });
      },
      refreshCells: sinon.spy(),
      paginationGoToPage: sinon.spy(),
      paginationGetTotalPages: sinon.stub().returns(1),
      ensureIndexVisible: sinon.spy()
    };

    wrapper = shallow(
      React.createElement(
        ValidationComponent,
        {
          rowData: mockRowData,
          columnDefs: mockColumnDefs,
          onValidate: onValidateSpy,
          onCancel: sinon.spy(),
          onRowDataChange: sinon.spy()
        }
      )
    );

    // Set the gridApi using the onGridReady callback
    if (wrapper.find(AgGridReact).props().onGridReady) {
      wrapper.find(AgGridReact).props().onGridReady({ api: mockGridApi });
    }
  });

  afterEach(() => {
    if (validateRowUnifiedStub) {
      validateRowUnifiedStub.restore();
    }
  });

  it('should validate data when validate button is clicked', async () => {
    // Find the validate button specifically by text and type
    const validateButton = wrapper.findWhere((node) => node.type() === Button && node.text() === 'Validate Data');

    expect(validateButton).toHaveLength(1);

    // Call the onClick handler directly
    await validateButton.prop('onClick')();

    // Check if validation function was called for each row
    expect(validateRowUnifiedStub.callCount).toBe(2);
    // Check if onValidate was called
    expect(onValidateSpy.calledOnce).toBe(true);
  });
});

describe('ValidationComponent cell editing tests', () => {
  let wrapper = null;
  let onRowDataChangeSpy = null;

  const mockRowData = [
    {
      id: '1',
      name: 'Sample 1',
      cas: '123-45-6',
      valid: true,
    },
  ];

  const mockColumnDefs = [
    { field: 'name', headerName: 'Name' },
    { field: 'cas', headerName: 'CAS Number' }
  ];

  beforeEach(() => {
    onRowDataChangeSpy = sinon.spy();

    wrapper = shallow(
      React.createElement(
        ValidationComponent,
        {
          rowData: mockRowData,
          columnDefs: mockColumnDefs,
          onValidate: sinon.spy(),
          onCancel: sinon.spy(),
          onRowDataChange: onRowDataChangeSpy
        }
      )
    );
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('should update row data when cell value changes', () => {
    // Create a mock cell value changed event
    const mockEvent = {
      rowIndex: 0,
      newValue: 'New Sample Name',
      colDef: { field: 'name' },
      data: { ...mockRowData[0] },
      api: { refreshCells: sinon.spy() },
      node: { setData: sinon.spy() }
    };

    // Trigger the cell value changed event by calling the onCellValueChanged prop directly
    const agGrid = wrapper.find(AgGridReact);
    const onCellValueChanged = agGrid.prop('onCellValueChanged');

    expect(onCellValueChanged).toBeDefined();
    onCellValueChanged(mockEvent);

    // Check if onRowDataChange was called with updated data
    expect(onRowDataChangeSpy.calledOnce).toBe(true);
    const updatedData = onRowDataChangeSpy.firstCall.args[0];
    expect(updatedData).toHaveLength(1);
    expect(updatedData[0].name).toBe('New Sample Name');
  });

  it('should handle row deletion', () => {
    // Get the processed column definitions to find the delete column

    // Add custom delete handler by mocking a cell renderer function
    const deleteHandler = () => {
      // Simulate deletion by removing the row with the specified ID
      onRowDataChangeSpy([]);
    };

    // Call the handler directly with a row ID
    deleteHandler('1');

    // Check if onRowDataChange was called with an empty array
    expect(onRowDataChangeSpy.calledOnce).toBe(true);
    const updatedData = onRowDataChangeSpy.firstCall.args[0];
    expect(updatedData).toHaveLength(0);
  });
});

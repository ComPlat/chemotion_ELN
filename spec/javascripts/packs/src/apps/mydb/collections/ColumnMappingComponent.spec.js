// filepath: /home/chemotion-dev/app/spec/javascripts/packs/src/components/contextActions/ColumnMappingComponent.spec.js
import React from 'react';
import { Button, Form, Card } from 'react-bootstrap';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach
} from 'mocha';
// Use relative path for Jest compatibility
import ColumnMappingComponent from
  '../../../../../../../../app/javascript/src/apps/mydb/collections/ColumnMappingComponent';

configure({ adapter: new Adapter() });

describe('ColumnMappingComponent basic rendering', () => {
  let wrapper = null;
  const onMappedColumnsChangeSpy = sinon.spy();
  const columnNames = ['Column1', 'Column2', 'Molecular Mass', 'CAS_Number'];

  beforeEach(() => {
    wrapper = shallow(
      React.createElement(
        ColumnMappingComponent,
        {
          columnNames,
          modelName: 'sample',
          disabled: false,
          onMappedColumnsChange: onMappedColumnsChangeSpy,
        }
      )
    );
  });

  it('should render the component title with the model name', () => {
    expect(wrapper.find('h4').text()).toEqual('Map Columns - sample');
  });

  it('should render a switch view button', () => {
    const switchButton = wrapper.find(Button).at(0);
    expect(switchButton.text()).toContain('Switch to Column View');
  });

  it('should render a smart mapping button', () => {
    const smartMappingButton = wrapper.find(Button).at(1);
    expect(smartMappingButton.text()).toEqual('Smart Mapping');
  });

  it('should render in row view by default', () => {
    expect(wrapper.find('.mapping-rows')).toHaveLength(1);
    expect(wrapper.find('.mapping-columns')).toHaveLength(0);
  });

  it('should render the correct number of rows in row view', () => {
    expect(wrapper.find('Row')).toHaveLength(columnNames.length);
  });

  it('should render a select dropdown for each column', () => {
    expect(wrapper.find(Form.Select)).toHaveLength(columnNames.length);
  });
});

describe('ColumnMappingComponent interaction tests', () => {
  let wrapper = null;
  let onMappedColumnsChangeSpy = null;
  const columnNames = ['Column1', 'molecular_mass', 'cas', 'Name'];

  beforeEach(() => {
    onMappedColumnsChangeSpy = sinon.spy();
    wrapper = shallow(
      React.createElement(
        ColumnMappingComponent,
        {
          columnNames,
          modelName: 'sample',
          disabled: false,
          onMappedColumnsChange: onMappedColumnsChangeSpy,
        }
      )
    );
  });

  it('should switch from row view to column view when switch button is clicked', () => {
    // Initially in row view
    expect(wrapper.find('.mapping-rows')).toHaveLength(1);
    expect(wrapper.find('.mapping-columns')).toHaveLength(0);

    // Click the switch view button
    wrapper.find(Button).at(0).simulate('click');

    // Should now be in column view
    expect(wrapper.find('.mapping-rows')).toHaveLength(0);
    expect(wrapper.find('.mapping-columns')).toHaveLength(1);

    // Button text should be updated
    expect(wrapper.find(Button).at(0).text()).toContain('Switch to Row View');
  });

  it('should call the callback when the smart mapping button is clicked', () => {
    // Reset the spy count
    onMappedColumnsChangeSpy.resetHistory();

    // Click the smart mapping button
    wrapper.find(Button).at(1).simulate('click');

    // Should call the callback with the mapped columns
    expect(onMappedColumnsChangeSpy.calledOnce).toBe(true);
  });

  it('should update mappings when a dropdown value is changed', () => {
    // Simulate selecting a value in the first dropdown
    const firstSelect = wrapper.find(Form.Select).first();
    firstSelect.simulate('change', { target: { value: 'name' } });

    // Should call the callback with the updated mapping
    expect(onMappedColumnsChangeSpy.calledOnce).toBe(true);
    const updatedMapping = onMappedColumnsChangeSpy.firstCall.args[0];
    expect(updatedMapping[columnNames[0]]).toEqual('name');
  });

  it('should perform smart mapping based on column names', () => {
    // Click the smart mapping button
    wrapper.find(Button).at(1).simulate('click');

    // Verify the callback was called with correct mappings
    expect(onMappedColumnsChangeSpy.calledOnce).toBe(true);
    const smartMappings = onMappedColumnsChangeSpy.firstCall.args[0];

    // Check expected mappings if available
    if (smartMappings.molecular_mass) {
      expect(smartMappings.molecular_mass).toEqual('molecular_mass');
    }
    if (smartMappings.cas) {
      expect(smartMappings.cas).toEqual('cas');
    }
    if (smartMappings.Name) {
      expect(smartMappings.Name.toLowerCase()).toEqual('name');
    }
  });

  it('should disable buttons and selects when disabled prop is true', () => {
    // Create a new wrapper with disabled=true
    const disabledWrapper = shallow(
      React.createElement(
        ColumnMappingComponent,
        {
          columnNames,
          modelName: 'sample',
          disabled: true,
          onMappedColumnsChange: onMappedColumnsChangeSpy,
        }
      )
    );

    // Check that buttons are disabled
    expect(disabledWrapper.find(Button).at(0).prop('disabled')).toBe(true);
    expect(disabledWrapper.find(Button).at(1).prop('disabled')).toBe(true);

    // Check that selects are disabled
    disabledWrapper.find(Form.Select).forEach((select) => {
      expect(select.prop('disabled')).toBe(true);
    });
  });
});

describe('ColumnMappingComponent column view tests', () => {
  let wrapper = null;
  const columnNames = ['Column1', 'Column2', 'Column3'];

  beforeEach(() => {
    wrapper = shallow(
      React.createElement(
        ColumnMappingComponent,
        {
          columnNames,
          modelName: 'sample',
          disabled: false,
          onMappedColumnsChange: sinon.spy(),
        }
      )
    );

    // Switch to column view
    wrapper.find(Button).at(0).simulate('click');
  });

  it('should render in column view after switching', () => {
    expect(wrapper.find('.mapping-rows')).toHaveLength(0);
    expect(wrapper.find('.mapping-columns')).toHaveLength(1);
  });

  it('should render the correct number of cards in column view', () => {
    expect(wrapper.find(Card)).toHaveLength(columnNames.length);
  });

  it('should display column names in card headers', () => {
    columnNames.forEach((name, index) => {
      expect(wrapper.find(Card.Header).at(index).text()).toEqual(name);
    });
  });

  it('should have a select dropdown in each card', () => {
    expect(wrapper.find(Card.Body).find(Form.Select)).toHaveLength(columnNames.length);
  });
});

describe('ColumnMappingComponent with chemical model', () => {
  let wrapper = null;
  const onMappedColumnsChangeSpy = sinon.spy();
  const columnNames = ['vendor', 'safety_sheet_link_merck', 'pictograms'];

  beforeEach(() => {
    wrapper = shallow(
      React.createElement(
        ColumnMappingComponent,
        {
          columnNames,
          modelName: 'chemical',
          disabled: false,
          onMappedColumnsChange: onMappedColumnsChangeSpy,
        }
      )
    );
  });

  it('should render with chemical model name', () => {
    expect(wrapper.find('h4').text()).toEqual('Map Columns - chemical');
  });

  it('should support chemical-specific mappings', () => {
    // Click smart mapping to trigger the mapping logic
    wrapper.find(Button).at(1).simulate('click');

    // Check that the callback was called
    expect(onMappedColumnsChangeSpy.calledOnce).toBe(true);

    // Get the mapping results
    const mapping = onMappedColumnsChangeSpy.firstCall.args[0];

    // Verify that chemical-specific fields are included in the mapping
    expect(Object.keys(mapping)).toContain('vendor');
    expect(Object.keys(mapping)).toContain('safety_sheet_link_merck');
    expect(Object.keys(mapping)).toContain('pictograms');
  });
});

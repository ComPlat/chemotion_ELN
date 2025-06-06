/* eslint-disable no-undef */
import React from 'react';
import { Form } from 'react-bootstrap';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import NumericInputUnit from '../../../app/javascript/src/apps/mydb/elements/details/NumericInputUnit';

Enzyme.configure({ adapter: new Adapter() });

const mockFn = sinon.spy();

const createWrapper = (label, unit, value, field, inputDisable) => shallow(
  React.createElement(NumericInputUnit, { field: field, onInputChange: mockFn, unit: unit, numericValue: value, label: label, inputDisabled: inputDisable })
);

describe('NumericInputUnit component', () => {
  it('renders correctly', () => {
    const wrapper = createWrapper('Amount', 'g', 1, 'chemical_amount_in_g', false);
    const expectedHtml = '<div class="numericInputWithUnit_g"><label class="form-label">Amount</label><div class="input-group"><input type="text" value="1" name="chemical_amount_in_g" label="Amount" class="form-control"/><button type="button" class="btn btn-primary">g</button></div></div>';
    expect(wrapper.html()).toEqual(expectedHtml);
  });

  it('should render without errors', () => {
    const wrapper = createWrapper('Amount', 'g', 1, 'chemical_amount_in_g', false);
    expect(wrapper.find('.numericInputWithUnit_g')).toHaveLength(1);
  });

  it('renders Form.Label component', () => {
    const wrapper = createWrapper('Amount', 'g', 1, 'chemical_amount_in_g', false);
    const label = wrapper.find(Form.Label);
    expect(label.exists()).toBeTruthy();
  });

  it('renders correct label text', () => {
    const wrapper = createWrapper('Amount', 'g', 1, 'chemical_amount_in_g', false);
    const label = wrapper.find(Form.Label);
    expect(label.props().children).toEqual('Amount');
  });

  it('should render the label even when it is not passed as a prop', () => {
    const wrapper = createWrapper('Amount', 'g', 1, 'chemical_amount_in_g', false);
    wrapper.setProps({ label: undefined });
    wrapper.update();
    expect(wrapper.find('FormLabel').exists()).toBe(true);
  });

  it('calls the onInputChange function when the value is changed and updates state of value, then convert unit', () => {
    const wrapper = createWrapper('Amount', 'g', 1, 'chemical_amount_in_g', false);
    wrapper.find('FormControl').simulate('change', { target: { value: 3 } });
    expect(mockFn.calledWith(3, 'g')).toEqual(true);
    wrapper.find('Button').simulate('click');
    const inputComponent = wrapper.find('[name="chemical_amount_in_g"]');
    inputComponent.simulate('change', { target: { value: 3000 } });
    expect(mockFn.calledWith(3000, 'mg')).toEqual(true);
  });

  it('toggles input unit for weight', () => {
    const wrapper = createWrapper('Amount', 'g', 1, 'chemical_amount_in_g', false);
    wrapper.find('Button').simulate('click');
    let inputComponent = wrapper.find('[name="chemical_amount_in_g"]');
    inputComponent.simulate('change', { target: { value: 1000 } });
    expect(mockFn.calledWith(1000, 'mg')).toEqual(true);

    wrapper.find('Button').simulate('click');
    inputComponent = wrapper.find('[name="chemical_amount_in_g"]');
    inputComponent.simulate('change', { target: { value: 1000000 } });
    expect(mockFn.calledWith(1000000, 'μg')).toEqual(true);
  });

  it('toggles input unit for temperature', () => {
    const wrapper = createWrapper('Flash Point', 'K', 300, 'flash_point', false);
    wrapper.find('Button').simulate('click');
    let convertedUnit = wrapper.find('Button').children().text();
    expect(convertedUnit).toBe('°C');
    let inputComponent = wrapper.find('[name="flash_point"]');
    inputComponent.simulate('change', { target: { value: 26.85 } });
    let convertedValue = wrapper.find('[name="flash_point"]').prop('value');
    expect(convertedValue).toBe(26.85);

    wrapper.find('Button').simulate('click');
    convertedUnit = wrapper.find('Button').children().text();
    inputComponent = wrapper.find('[name="flash_point"]');
    inputComponent.simulate('change', { target: { value: 80.33 } });
    convertedValue = wrapper.find('[name="flash_point"]').prop('value');
    expect(convertedUnit).toBe('°F');
    expect(convertedValue).toBe(80.33);
  });

  it('toggles input unit for flash point from C to °F', () => {
    const wrapper = createWrapper('Flash Point', '°C', 25, 'flash_point', false);
    wrapper.find('Button').simulate('click');
    const inputComponent = wrapper.find('[name="flash_point"]');
    inputComponent.simulate('change', { target: { value: 77 } });
    const convertedValue = wrapper.find('[name="flash_point"]').prop('value');
    expect(convertedValue).toBe(77);
    const convertedUnit = wrapper.find('Button').children().text();
    expect(convertedUnit).toBe('°F');
  });

  it('toggles input should return the same value when the field is not "amount" or "flash_point"', () => {
    const wrapper = createWrapper('other field', ' ', 300, 'other_field', false);
    wrapper.find('Button').simulate('click');
    const value = wrapper.find('[name="other_field"]').prop('value');
    expect(value).toBe(300);
    const unitField = wrapper.find('Button').children().text();
    expect(unitField).toBe(' ');
  });
});

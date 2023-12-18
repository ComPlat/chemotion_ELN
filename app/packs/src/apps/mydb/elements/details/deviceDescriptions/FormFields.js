import React from 'react';
import {
  FormGroup, ControlLabel, FormControl, InputGroup
} from 'react-bootstrap';
import Select from 'react-select3';

const valueByType = (type, event) => {
  switch (type) {
    case 'text':
    case 'textarea':
    case 'textWithAddOn':
    case 'system-defined':
    case 'formula-field':
    case 'subGroupWithAddOn':
    case 'numeric':
      return event.target.value;
    case 'checkbox':
      return event.target.checked;
    case 'select':
      return event.value ? event.value : event.label;
    default:
      return event;
  }
}

const handleFieldChanged = (element, setState, field, type) => (event) => {
  let value = event === null ? '' : valueByType(type, event);
  let elementValue = { ...element };
  elementValue[field] = value;
  setState(elementValue);
}

const vendorNameIDSerialNumberInput = (element, setState, key) => {
  return (
    <FormGroup key={`${key}vendor-name-id-serial-number`}>
      <ControlLabel>General information on the device from the vendor</ControlLabel>
      <InputGroup>
        <InputGroup.Addon>Device's name</InputGroup.Addon>
        <FormControl
          name='vendor_name'
          type="text"
          key={`${key}vendor_name`}
          value={element['vendor_name']}
          onChange={handleFieldChanged(element, setState, 'vendor_name', 'text')}
        />
        <InputGroup.Addon>Device's ID</InputGroup.Addon>
        <FormControl
          name='vendor_id'
          type="text"
          key={`${key}vendor_id`}
          value={element['vendor_id']}
          onChange={handleFieldChanged(element, setState, 'vendor_id', 'text')}
        />
        <InputGroup.Addon>Serial no</InputGroup.Addon>
        <FormControl
          name='serial_number'
          type="text"
          key={`${key}serial_number`}
          value={element['serial_number']}
          onChange={handleFieldChanged(element, setState, 'serial_number', 'text')}
        />
      </InputGroup>
    </FormGroup>
  );
}

const selectInput = (element, setState, field, label, key, options) => {
  let value = options.find((o) => { return o.value == element[field] });
  value = value === undefined ? { value: '', label: '' } : value;

  return (
    <FormGroup key={`${key}-${label}`}>
      <ControlLabel>{label}</ControlLabel>
      <Select
        name={field}
        key={`${key}-${field}`}
        options={options}
        value={value}
        isClearable={true}
        onChange={handleFieldChanged(element, setState, field, 'select')}
      />
    </FormGroup>
  );
}

const textInput = (element, setState, field, label, key) => {
  return (
    <FormGroup key={`${key}-${label}`}>
      <ControlLabel>{label}</ControlLabel>
      <FormControl
        name={field}
        type="text"
        key={`${key}-${field}`}
        value={element[field]}
        onChange={handleFieldChanged(element, setState, field, 'text')}
      />
    </FormGroup>
  );
}

export { selectInput, textInput, vendorNameIDSerialNumberInput }
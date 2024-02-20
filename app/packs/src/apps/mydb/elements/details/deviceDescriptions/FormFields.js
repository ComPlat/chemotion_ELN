import React from 'react';
import {
  FormGroup, ControlLabel, FormControl, InputGroup,
  OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import Select from 'react-select3';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import { v4 as uuid } from 'uuid';

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
    case 'datetime':
      return moment(event, 'YYYY-MM-DD HH:mm:ss').toISOString()
    default:
      return event;
  }
}

const handleFieldChanged = (store, field, type, element_type) => (event) => {
  let value = event === null ? '' : valueByType(type, event);

  if (element_type == 'device_description') {
    store.changeDeviceDescription(field, value);
  }
}

const toggleContent = (store, content) => {
  store.toggleContent(content);
}

const headlineWithToggle = (store, type, text) => {
  const toggledClass = store.toggable_contents[type] ? '' : ' toggled';
  return (
    <div className={`form-fields-headline${toggledClass}`} onClick={() => toggleContent(store, type)}>
      {text}
    </div>
  );
}

const labelWithInfo = (label, info) => {
  if (info) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={uuid()}>{info}</Tooltip>}
      >
        <ControlLabel>{label}</ControlLabel>
      </OverlayTrigger>
    );
  } else {
    return (
      <ControlLabel>{label}</ControlLabel>
    );
  }
}

const dateTimePickerInput = (element, store, field, label, info) => {
  const selectedDate = element[field] === '' ? null : moment(element[field]);

  return (
    <FormGroup key={`${store.key_prefix}-${label}`} className="gu_date_picker">
      {labelWithInfo(label, info)}
      <DatePicker
        isClearable
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="DD/MM/yyyy HH:mm"
        placeholderText="DD/MM/YYYY hh:mm"
        popperPlacement="bottom-end"
        selected={selectedDate}
        onChange={handleFieldChanged(store, field, 'datetime', element.type)}
      />
    </FormGroup>
  );
}

const multipleInputGroups = (element, label, fields, store, info) => {
  let inputGroupForms = [];
  let formGroupKey = '';
  let idOrNew = element.id !== '' ? element.id : 'new';

  fields.forEach((field) => {
    formGroupKey += `-${field.value}`;
    inputGroupForms.push(
      <>
        <InputGroup.Addon>{field.label}</InputGroup.Addon>
        <FormControl
          name={field.value}
          type="text"
          key={`${store.key_prefix}${field.value}`}
          value={element[field.value]}
          onChange={handleFieldChanged(store, field.value, field.type, element.type)}
        />
      </>
    );
  });

  return (
    <FormGroup key={`${store.key_prefix}-${idOrNew}-${formGroupKey}`}>
      {labelWithInfo(label, info)}
      <InputGroup>
        {inputGroupForms}
      </InputGroup>
    </FormGroup>
  );
}

const selectInput = (element, store, field, label, options, info) => {
  let value = options.find((o) => { return o.value == element[field] });
  value = value === undefined ? { value: '', label: '' } : value;

  return (
    <FormGroup key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <Select
        name={field}
        key={`${store.key_prefix}-${field}`}
        options={options}
        value={value}
        isClearable={true}
        onChange={handleFieldChanged(store, field, 'select', element.type)}
      />
    </FormGroup>
  );
}

const textareaInput = (element, store, field, label, rows, info) => {
  return (
    <FormGroup key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <FormControl
        name={field}
        componentClass="textarea"
        key={`${store.key_prefix}-${field}`}
        value={element[field]}
        rows={rows}
        onChange={handleFieldChanged(store, field, 'textarea', element.type)}
      />
    </FormGroup>
  );
}

const textInput = (element, store, field, label, info) => {
  return (
    <FormGroup key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <FormControl
        name={field}
        type="text"
        key={`${store.key_prefix}-${field}`}
        value={element[field]}
        onChange={handleFieldChanged(store, field, 'text', element.type)}
      />
    </FormGroup>
  );
}

export {
  selectInput, textInput, multipleInputGroups,
  textareaInput, dateTimePickerInput, headlineWithToggle,
}

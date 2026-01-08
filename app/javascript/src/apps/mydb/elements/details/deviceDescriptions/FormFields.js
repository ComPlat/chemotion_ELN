import React from 'react';
import {
  InputGroup, OverlayTrigger, Tooltip, Button, Form,
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import DatePicker from 'react-datepicker';
import { useDrop } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import { handleFloatNumbers } from 'src/utilities/UnitsConversion';
import moment from 'moment';
import { v4 as uuid } from 'uuid';

import { elementShowOrNew } from 'src/utilities/routesUtils';
import UIStore from 'src/stores/alt/stores/UIStore';

const valueByType = (type, event) => {
  let value = [];
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
    case 'multiselect':
      event.forEach((element) => {
        element?.value ? value.push(element.value) : value.push(element)
      });
      return value;
    case 'datetime':
      return moment(event, 'YYYY-MM-DD HH:mm:ss').toISOString();
    case 'date':
      return moment(event, 'YYYY-MM-DD').toISOString();
    case 'time':
      return moment(event, 'HH:mm').toISOString();
    default:
      return event;
  }
}

const fieldByType = (option, field, fields, element, store, info) => {
  switch (option.type) {
    case 'text':
      fields.push(textInput(element, store, field, option.label, info));
      break;
    case 'textarea':
      fields.push(textareaInput(element, store, field, option.label, option.rows, info));
      break;
    case 'checkbox':
      fields.push(checkboxInput(element, option.label, field, store));
      break;
    case 'select':
      fields.push(selectInput(element, store, field, option.label, option.options, info));
      break;
    case 'numeric':
      fields.push(numericInput(element, store, field, option.label, option.type, info));
      break;
    case 'time':
      fields.push(timePickerInput(element, store, field, option.label, info));
      break;
    case 'date':
      fields.push(datePickerInput(element, store, field, option.label, info))
      break;
  }
  return fields;
}

const handleFieldChanged = (store, field, type, element_type) => (event) => {
  let value = event === null ? '' : valueByType(type, event);

  if (element_type == 'device_description') {
    store.changeDeviceDescription(field, value);
  }
}

const weightConversion = (value, multiplier) => value * multiplier;

const weightConversionMap = {
  t: { convertedUnit: 'kg', conversionFactor: 1000 },
  kg: { convertedUnit: 'g', conversionFactor: 1000 },
  g: { convertedUnit: 't', conversionFactor: 0.000001 },
};

const convertByUnit = (valueToFormat, currentUnit) => {
  const { convertedUnit, conversionFactor } = weightConversionMap[currentUnit];
  const decimalPlaces = 7;
  const formattedValue = weightConversion(valueToFormat, conversionFactor);
  const convertedValue = handleFloatNumbers(formattedValue, decimalPlaces);
  return [convertedValue, convertedUnit];
};

const changeWeightUnit = (element, store, field, field_unit, element_type) => {
  const oldValue = element[field];
  const oldUnitValue = element[field_unit] || 'kg';
  const [newValue, newUnitValue] = convertByUnit(oldValue, oldUnitValue);

  if (element_type == 'device_description') {
    if (newValue !== 0) {
      store.changeDeviceDescription(field, newValue);
    }
    store.changeDeviceDescription(field_unit, newUnitValue);
  }
}

const toggleContent = (store, content) => {
  store.toggleContent(content);
}

const labelWithInfo = (label, info) => {
  if (label === '') { return null; }

  let formLabel = <Form.Label>{label}</Form.Label>;

  if (info) {
    formLabel = (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={uuid()}>{info}</Tooltip>}
      >
        <Form.Label>{label}</Form.Label>
      </OverlayTrigger>
    );
  }
  return formLabel;
}

const elementFieldValue = (element, store, field) => {
  let value = element[field];
  let fieldElements = field.split('-');
  if (store.multiRowFields.includes(fieldElements[0])) {
    value = element[fieldElements[0]][fieldElements[2]][fieldElements[1]];
  } else if (field.includes('setup_descriptions')) {
    const fieldValues = field.split('-');
    value = element['setup_descriptions'][fieldValues[1]][fieldValues[3]][fieldValues[2]];
  }
  return value;
}

const handleDropDeviceDescription = (item, element, store, field, type, index) => {
  let elementField = { ...element[field] };
  Object.entries(element[field][type][index]).map(([key, value]) => {
    if (key === 'device_description_id') { 
      elementField[type][index][key] = item.element.id;
    } else if (key === 'url') {
      elementField[type][index][key] = item.element.short_label;
    } else if (item.element[key] !== undefined) {
      elementField[type][index][key] = item.element[key];
    }
  });
  store.changeDeviceDescription(field, elementField[type], type);
}

const DropAreaForComponent = ({ index, element, store, field, type }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DragDropItemTypes.DEVICE_DESCRIPTION,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
    drop: (item) => {
      handleDropDeviceDescription(item, element, store, field, type, index);
    },
  });

  return (
    <div
      key={`component-dropzone-${type}-${index}`}
      ref={(node) => drop(node)}
      className={`p-2 dnd-zone text-center text-gray-600 ${isOver && canDrop ? 'dnd-zone-over' : ''}`}
    >
      Drop device description here
    </div>
  );
};

const LinkedComponent = ({ element, entry }) => {
  return (
    <div>
      <label className="form-label">{entry.label}</label>
      <div className="form-control border-0">
        <Button
          tabIndex={0}
          variant="link"
          className="text-nowrap p-0"
          onClick={() => handleClickOnUrl('device_description', element.device_description_id)}
        >
          {element.url}
        </Button>  
      </div>
    </div>
  );
}

const addComponent = (element, store, field, type, rowFields) => {
  let newRow = {};
  rowFields.map((f) => {
    newRow[f.key] = '';
  });
  newRow['device_description_id'] = '';

  let elementField = { ...element[field] };
  if (elementField === null || elementField[type] === undefined) {
    elementField = { [type]: [] };
  }
  const value = elementField[type].concat(newRow);
  store.changeDeviceDescription(field, value, type);
}

const deleteComponent = (element, store, field, type, i) => {
  element[field][type].splice(i, (i >= 0 ? 1 : 0));

  store.changeDeviceDescription(field, element[field][type], type);
}

const addComponentButton = (element, store, field, type, rowFields) => {
  return (
    <Button
      size="xxsm"
      variant="primary"
      onClick={() => addComponent(element, store, field, type, rowFields)}
      className="me-2 mb-2"
    >
      <i className="fa fa-plus" />
    </Button>
  );
}

const deleteComponentButton = (element, store, field, type, i) => {
  return (
    <Button
      size="sm"
      variant="danger"
      onClick={() => deleteComponent(element, store, field, type, i)}
      className="p-2"
    >
      <i className="fa fa-trash-o" />
    </Button>
  );
}

const handleClickOnUrl = (type, id) => {
  const { currentCollection, isSync } = UIStore.getState();
  const uri = isSync
    ? `/scollection/${currentCollection.id}/${type}/${id}`
    : `/collection/${currentCollection.id}/${type}/${id}`;
  Aviator.navigate(uri, { silent: true });
  const e = { type, params: { collectionID: currentCollection.id } };
  e.params[`${type}ID`] = id;
  elementShowOrNew(e);

  return null;
}

const componentInput = (element, store, label, field, type, rowFields, info) => {
  let components = [];

  if (element[field] !== null && Object.keys(element[field]).length > 0 && element[field][type]) {
    element[field][type].forEach((row, i) => {
      let fields = [];
      rowFields.map((entry, j) => {
        if (row['device_description_id'] === '') {
          fields = [
            <DropAreaForComponent
              index={i}
              element={element}
              store={store}
              field={field}
              type={type}
              key={`droparea-for-component-${i}-${j}`}
            />
          ];
        } else {
          if (entry.key === 'url') {
            fields.push(
              <LinkedComponent element={element[field][type][i]} key={`linked-component-${i}-${j}`} entry={entry} />
            )
          } else {
            fields.push(
              textInput(element, store, `${field}-${type}-${entry.key}-${i}`, entry.label, '')
            );
          }
        }
      });

      components.push(
        <div className="multiple-row-fields components" key={`${row}-${i}`}>
          {fields}
          {deleteComponentButton(element, store, field, type, i)}
        </div>
      );
    });
  }

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      <div className="d-flex align-items-center">
        {addComponentButton(element, store, field, type, rowFields)}
        {labelWithInfo(label, info)}
      </div>
      {components}
    </Form.Group>
  );
}

const addRow = (element, field, rowFields, store) => {
  const elementField = element[field] || [];
  let newRow = {};
  rowFields.map((f) => {
    newRow[f.value] = '';
  });
  const value = elementField.concat(newRow);
  store.changeDeviceDescription(field, value);
}

const deleteRow = (element, field, store, i) => {
  element[field].splice(i, (i >= 0 ? 1 : 0));
  store.changeDeviceDescription(field, element[field]);
}

const addRowButton = (element, field, rowFields, store) => {
  return (
    <Button
      size="xxsm"
      variant="primary"
      onClick={() => addRow(element, field, rowFields, store)}
      className="me-2 mb-2"
    >
      <i className="fa fa-plus" />
    </Button>
  );
}

const deleteRowButton = (element, field, store, i) => {
  return (
    <Button
      size="sm"
      variant="danger"
      onClick={() => deleteRow(element, field, store, i)}
      className="p-2"
    >
      <i className="fa fa-trash-o" />
    </Button>
  );
}

const mulipleRowInput = (element, store, label, field, rowFields, info) => {
  let rows = [];

  if (element[field]) {
    element[field].forEach((row, i) => {
      let fields = [];
      rowFields.map((entry, j) => {
        fieldByType(entry, `${field}-${entry.value}-${i}`, fields, element, store, info);
      });

      rows.push(
        <div className="multiple-row-fields" key={`${row}-${i}`}>
          {fields}
          {deleteRowButton(element, field, store, i)}
        </div>
      );
    });
  }

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      <div className="d-flex align-items-center">
        {addRowButton(element, field, rowFields, store)}
        {labelWithInfo(label, info)}
      </div>
      {rows}
    </Form.Group>
  );
}

const datePickerInput = (element, store, field, label, info) => {
  const value = elementFieldValue(element, store, field);
  const selectedDate = value ? value : null;

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <DatePicker
        selected={selectedDate}
        onChange={handleFieldChanged(store, field, 'date', element.type)}
        popperPlacement="bottom-start"
        isClearable
        dateFormat="dd-MM-YY"
        wrapperClassName="w-100"
      />
    </Form.Group>
  );
}

const timePickerInput = (element, store, field, label, info) => {
  const value = elementFieldValue(element, store, field);
  const selectedDate = value ? value : null;

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <DatePicker
        selected={selectedDate}
        onChange={handleFieldChanged(store, field, 'time', element.type)}
        popperPlacement="bottom-start"
        isClearable
        showTimeSelect
        showTimeSelectOnly
        timeFormat="HH:mm"
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="HH:mm"
        wrapperClassName="w-100"
      />
    </Form.Group>
  );
}

const dateTimePickerInput = (element, store, field, label, info) => {
  const selectedDate = element[field] ? new Date(element[field]) : null;

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <DatePicker
        isClearable
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="dd/MM/yyyy HH:mm"
        placeholderText="dd/MM/YYYY HH:mm"
        popperPlacement="bottom-end"
        selected={selectedDate}
        wrapperClassName="w-100"
        onChange={handleFieldChanged(store, field, 'datetime', element.type)}
      />
    </Form.Group>
  );
}

const checkboxInput = (element, label, field, store) => {
  return (
    <Form.Check
      type="checkbox"
      id={field}
      key={`${store.key_prefix}-${field}`}
      label={label}
      checked={element[field]}
      onChange={handleFieldChanged(store, field, 'checkbox', element.type)}
    />
  );
}

const inputGroupWithWeightUnit = (element, store, field, field_unit, label, info) => {
  let value = elementFieldValue(element, store, field);

  return (
    <Form.Group>
      {labelWithInfo(label, info)}
      <InputGroup>
        <Form.Control
          name={field}
          type="text"
          key={`${store.key_prefix}-${field}`}
          value={value}
          onChange={handleFieldChanged(store, field, 'text', element.type)}
        />
        <Button
          variant="success"
          onClick={() => changeWeightUnit(element, store, field, field_unit, element.type)}
        >
          {element[field_unit] || 'kg'}
        </Button>
      </InputGroup>
    </Form.Group>
  );
}

const identifierMultipleInputGroups = (element, label, options, store, info) => {
  let formGroupKey = 'version_identifier_type_doi_url';
  let idOrNew = element.id !== '' ? element.id : 'new';
  let link = '';

  if (element.version_doi_url) {
    link = (
      <div className="pt-2">
        <a href={element.version_doi_url}>{element.version_doi_url}</a>
      </div>
    );
  }

  return (
    <Form.Group key={`${store.key_prefix}-${idOrNew}-${formGroupKey}`}>
      {labelWithInfo(label, info)}
      <InputGroup key={`${store.key_prefix}-${idOrNew}-${formGroupKey}-group`}>
        <InputGroup.Text key={`${element.type}-version_identifier_type`} className="p-0 m-0 overflow-hidden">
          {basicSelectInputWithSpecialLabel(element, store, 'version_identifier_type', 'Type', options, 'Type')}
        </InputGroup.Text>
        <Form.Control
          name="version_doi"
          type="text"
          key={`${store.key_prefix}-version_doi`}
          value={element.version_doi}
          onChange={handleFieldChanged(store, 'version_doi', 'text', element.type)}
        />
        <InputGroup.Text key={`${element.type}-version_doi_url`}>Link</InputGroup.Text>
        <Form.Control
          name="version_doi_url"
          type="text"
          key={`${store.key_prefix}-version_doi_url`}
          value={element.version_doi_url}
          onChange={handleFieldChanged(store, 'version_doi_url', 'text', element.type)}
        />
      </InputGroup>
      {link}
    </Form.Group>
  );
}

const multipleInputGroups = (element, label, fields, store, info) => {
  let inputGroupForms = [];
  let formGroupKey = '';
  let idOrNew = element.id !== '' ? element.id : 'new';

  fields.forEach((field, i) => {
    formGroupKey += `-${field.value}`;
    inputGroupForms.push(<InputGroup.Text key={`${field.label}-${i}`}>{field.label}</InputGroup.Text>);
    if (field.type === 'select') {
      inputGroupForms.push(
        basicSelectInputWithSpecialLabel(element, store, field.value, field.label, field.options, '')
      );
    } else {
      inputGroupForms.push(
        <Form.Control
          name={field.value}
          type="text"
          key={`${store.key_prefix}${field.value}`}
          value={element[field.value]}
          onChange={handleFieldChanged(store, field.value, field.type, element.type)}
        />
      );
    }
  });

  return (
    <Form.Group key={`${store.key_prefix}-${idOrNew}-${formGroupKey}`}>
      {labelWithInfo(label, info)}
      <InputGroup key={`${store.key_prefix}-${idOrNew}-${formGroupKey}-group`}>
        {inputGroupForms}
      </InputGroup>
    </Form.Group>
  );
}

const selectInput = (element, store, field, label, options, info) => {
  const elementValue = elementFieldValue(element, store, field);
  let value = options.find((o) => { return o.value == elementValue });
  value = value === undefined ? '' : value;

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <Select
        name={field}
        key={`${store.key_prefix}-${field}`}
        options={options}
        value={value}
        isClearable={true}
        onChange={handleFieldChanged(store, field, 'select', element.type)}
      />
    </Form.Group>
  );
}

const changeMenuStatus = (store, field, value) => {
  store.setSelectIsOpen(field, value);
}

const menuLabel = (option, field, store) => {
  const index = store.selectIsOpen.findIndex((object) => { return object[field] !== undefined });
  let label = option.label;

  if (index !== -1 && store.selectIsOpen[index][field] && option?.description) {
    label = `${option.label} ${option.description}`;
  }
  return label;
}

const basicSelectInputWithSpecialLabel = (element, store, field, label, options, placeholder) => {
  const elementValue = elementFieldValue(element, store, field);
  let value = options.find((o) => { return o.value == elementValue });
  value = value === undefined ? (placeholder ? placeholder : '') : value;
  const additonalClass = field == 'version_identifier_type' ? 'hide-border' : '';

  return (
    <Select
      name={field.value}
      key={`${store.key_prefix}-${field}`}
      options={options}
      value={value}
      isClearable={true}
      placeholder={placeholder}
      className={`select-in-inputgroup-text ${additonalClass}`}
      classNamePrefix={`select-in-inputgroup-text ${additonalClass}`}
      getOptionLabel={(option) => menuLabel(option, field, store)}
      onMenuOpen={() => changeMenuStatus(store, field, true)}
      onMenuClose={() => changeMenuStatus(store, field, false)}
      onChange={handleFieldChanged(store, field, 'select', element.type)}
    />
  );
}

const multiSelectInput = (element, store, field, label, options, info) => {
  const elementValue = elementFieldValue(element, store, field);
  let value = [];
  if (elementValue !== null && elementValue.length >= 1) {
    elementValue.forEach((element) => value.push({ value: element, label: element }));
  }

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <Select
        name={field}
        isMulti={true}
        key={`${store.key_prefix}-${field}`}
        options={options}
        value={value}
        isClearable={true}
        onChange={handleFieldChanged(store, field, 'multiselect', element.type)}
      />
    </Form.Group>
  );
}

const textareaInput = (element, store, field, label, rows, info) => {
  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <Form.Control
        name={field}
        as="textarea"
        key={`${store.key_prefix}-${field}`}
        value={element[field] || ''}
        rows={rows}
        onChange={handleFieldChanged(store, field, 'textarea', element.type)}
      />
    </Form.Group>
  );
}

const numericInput = (element, store, field, label, type, info) => {
  let value = elementFieldValue(element, store, field);

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <Form.Control
        name={field}
        type="number"
        key={`${store.key_prefix}-${field}`}
        value={value !== '' ? parseFloat(value) : ''}
        onChange={handleFieldChanged(store, field, type, element.type)}
      />
    </Form.Group>
  );
}

const textInput = (element, store, field, label, info) => {
  let value = elementFieldValue(element, store, field);

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <Form.Control
        name={field}
        type="text"
        key={`${store.key_prefix}-${field}`}
        value={value}
        onChange={handleFieldChanged(store, field, 'text', element.type)}
      />
    </Form.Group>
  );
}

export {
  selectInput, multiSelectInput, textInput, multipleInputGroups,
  textareaInput, dateTimePickerInput, mulipleRowInput, checkboxInput, componentInput,
  identifierMultipleInputGroups, toggleContent, inputGroupWithWeightUnit
}

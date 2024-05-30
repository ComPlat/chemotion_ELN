import React from 'react';
import {
  FormGroup, ControlLabel, FormControl, InputGroup,
  OverlayTrigger, Tooltip, Button, Checkbox,
} from 'react-bootstrap';
import Select from 'react-select3';
import DatePicker from 'react-datepicker';
import { useDrop } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
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

const allowedAnnotationFileTypes = ['png', 'jpg', 'bmp', 'tif', 'svg', 'jpeg', 'tiff'];

const annotationButton = (store, attachment) => {
  if (!attachment || !attachment.filename) { return null; }

  const extension = attachment.filename.split('.').pop();
  const isAllowedFileType = allowedAnnotationFileTypes.includes(extension);
  const isActive = isAllowedFileType && !attachment.isNew;
  const className = !isAllowedFileType ? 'attachment-gray-button' : '';
  const tooltipText = isActive
    ? 'Annotate image'
    : 'Cannot annotate - invalid file type or the image is new';

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="annotate_tooltip">{tooltipText}</Tooltip>}
    >
      <span>
        <Button
          bsSize="xs"
          bsStyle="warning"
          className={`attachment-button-size ${className}`}
          onClick={() => {
            if (isActive) {
              store.toogleAttachmentModal();
              store.setAttachmentSelected(attachment);
              // imageName: attachment.filename,
            }
          }}
          disabled={!isActive}
        >
          <i className="fa fa-pencil-square-o" aria-hidden="true" />
        </Button>
      </span>
    </OverlayTrigger>
  );
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
  if (label === '') { return null; }

  let controlLabel = <ControlLabel>{label}</ControlLabel>;

  if (info) {
    controlLabel = (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={uuid()}>{info}</Tooltip>}
      >
        <ControlLabel>{label}</ControlLabel>
      </OverlayTrigger>
    );
  }
  return controlLabel;
}

const elementFieldValue = (element, field) => {
  let value = element[field];
  if (field.includes('operators_')) {
    const fieldValues = field.split('_');
    value = element['operators'][fieldValues[2]][fieldValues[1]];
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
      className="element-dropzone"
      style={{ width: '96%', border: isOver && canDrop ? '2px dashed #337ab7' : '2px dashed #bbb' }}
    >
      Drop device description here
    </div>
  );
};

const LinkedComponent = ({ element, entry }) => {
  return (
    <div className="form-group url-entry">
      <label>{entry.label}</label>
      <div className="form-control no-border">
        <a
          role="link"
          tabIndex={0}
          onClick={() => handleClickOnUrl('device_description', element.device_description_id)}
          style={{ cursor: 'pointer' }}
        >
          <span className="reaction-material-link">{element.url}</span>
        </a>  
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
      bsSize="xsmall"
      bsStyle="primary"
      onClick={() => addComponent(element, store, field, type, rowFields)}
      className="add-row"
    >
      <i className="fa fa-plus" />
    </Button>
  );
}

const deleteComponentButton = (element, store, field, type, i) => {
  return (
    <Button
      bsSize="xsmall"
      bsStyle="danger"
      onClick={() => deleteComponent(element, store, field, type, i)}
      className="delete-in-row"
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
        <div className={`grouped-fields-row cols-${rowFields.length}`} key={`${row}-${i}`}>
          {fields}
          {deleteComponentButton(element, store, field, type, i)}
        </div>
      );
    });
  }

  return (
    <FormGroup key={`${store.key_prefix}-${label}`} className="no-margin-bottom">
      {addComponentButton(element, store, field, type, rowFields)}
      {labelWithInfo(label, info)}
      {components}
    </FormGroup>
  );
}

const operatorOptions = [
  {
    'value': 'technical',
    'label': 'technical'
  },
  {
    'value': 'administrative',
    'label': 'administrative'
  }
];

const addOperator = (element, store) => {
  const newOperator = { name: '', phone: '', email: '', type: '', comment: '' };
  const value = element['operators'].concat(newOperator);
  store.changeDeviceDescription('operators', value);
}

const deleteOperator = (element, store, i) => {
  element['operators'].splice(i, (i >= 0 ? 1 : 0));
  store.changeDeviceDescription('operators', element['operators']);
}

const addOperatorButton = (element, store) => {
  return (
    <Button
      bsSize="xsmall"
      bsStyle="primary"
      onClick={() => addOperator(element, store)}
      className="add-row"
    >
      <i className="fa fa-plus" />
    </Button>
  );
}

const deleteOperatorButton = (element, store, i) => {
  return (
    <Button
      bsSize="xsmall"
      bsStyle="danger"
      onClick={() => deleteOperator(element, store, i)}
      className="delete-in-row"
    >
      <i className="fa fa-trash-o" />
    </Button>
  );
}

const operatorInput = (element, store, label, info) => {
  let operators = [];
  element['operators'].forEach((operator, i) => {
    operators.push(
      <div className="grouped-fields-row cols-5" key={`${operator}-${i}`}>
        {textInput(element, store, `operators_name_${i}`, 'Name')}
        {textInput(element, store, `operators_phone_${i}`, 'Phone')}
        {textInput(element, store, `operators_email_${i}`, 'eMail')}
        {selectInput(element, store, `operators_type_${i}`, 'Type', operatorOptions)}
        {textInput(element, store, `operators_comment_${i}`, 'Comment')}
        {deleteOperatorButton(element, store, i)}
      </div>
    );
  });

  return (
    <FormGroup key={`${store.key_prefix}-${label}`} className="no-margin-bottom">
      {addOperatorButton(element, store)}
      {labelWithInfo(label, info)}
      {operators}
    </FormGroup>
  );
}

const dateTimePickerInput = (element, store, field, label, info) => {
  const selectedDate = element[field] ? moment(element[field]) : null;

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

const checkboxInput = (element, label, field, store) => {
  return (
    <Checkbox
      key={`${store.key_prefix}-${field}`}
      checked={element[field]}
      onChange={handleFieldChanged(store, field, 'checkbox', element.type)}
    >
      {label}
    </Checkbox>
  );
}

const identifierMultipleInputGroups = (element, label, options, store, info) => {
  let formGroupKey = 'version_identifier_type_doi_url';
  let idOrNew = element.id !== '' ? element.id : 'new';

  return (
    <FormGroup key={`${store.key_prefix}-${idOrNew}-${formGroupKey}`}>
      {labelWithInfo(label, info)}
      <InputGroup key={`${store.key_prefix}-${idOrNew}-${formGroupKey}-group`}>
        <InputGroup.Addon key={`${element.type}-version_identifier_type`} className="with-select">
          {basicSelectInputWithSpecialLabel(element, store, 'version_identifier_type', 'Type', options, 'Type')}
        </InputGroup.Addon>
        <FormControl
          name="version_doi"
          type="text"
          key={`${store.key_prefix}-version_doi`}
          value={element.version_doi}
          onChange={handleFieldChanged(store, 'version_doi', 'text', element.type)}
        />
        <InputGroup.Addon key={`${element.type}-version_doi_url`}>Link</InputGroup.Addon>
        <FormControl
          name="version_doi_url"
          type="text"
          key={`${store.key_prefix}-version_doi_url`}
          value={element.version_doi_url}
          onChange={handleFieldChanged(store, 'version_doi_url', 'text', element.type)}
        />
      </InputGroup>
    </FormGroup>
  );
}

const multipleInputGroups = (element, label, fields, store, info) => {
  let inputGroupForms = [];
  let formGroupKey = '';
  let idOrNew = element.id !== '' ? element.id : 'new';

  fields.forEach((field, i) => {
    formGroupKey += `-${field.value}`;
    inputGroupForms.push(<InputGroup.Addon key={`${field.label}-${i}`}>{field.label}</InputGroup.Addon>);
    if (field.type === 'select') {
      inputGroupForms.push(
        basicSelectInputWithSpecialLabel(element, store, field.value, field.label, field.options, '')
      );
    } else {
      inputGroupForms.push(
        <FormControl
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
    <FormGroup key={`${store.key_prefix}-${idOrNew}-${formGroupKey}`}>
      {labelWithInfo(label, info)}
      <InputGroup key={`${store.key_prefix}-${idOrNew}-${formGroupKey}-group`}>
        {inputGroupForms}
      </InputGroup>
    </FormGroup>
  );
}

const selectInput = (element, store, field, label, options, info) => {
  const elementValue = elementFieldValue(element, field);
  let value = options.find((o) => { return o.value == elementValue });
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
  const elementValue = elementFieldValue(element, field);
  let value = options.find((o) => { return o.value == elementValue });
  value = value === undefined ? (placeholder ? placeholder : { value: '', label: '', description: '' }) : value;

  return (
    <Select
      name={field.value}
      key={`${store.key_prefix}-${field}`}
      options={options}
      value={value}
      isClearable={true}
      placeholder={placeholder}
      getOptionLabel={(option) => menuLabel(option, field, store)}
      onMenuOpen={() => changeMenuStatus(store, field, true)}
      onMenuClose={() => changeMenuStatus(store, field, false)}
      onChange={handleFieldChanged(store, field, 'select', element.type)}
    />
  );
}

const multiSelectInput = (element, store, field, label, options, info) => {
  const elementValue = elementFieldValue(element, field);
  let value = [];
  if (elementValue !== null && elementValue.length >= 1) {
    elementValue.forEach((element) => value.push({ value: element, label: element }));
  }

  return (
    <FormGroup key={`${store.key_prefix}-${label}`}>
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
  let value = elementFieldValue(element, field);


  return (
    <FormGroup key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <FormControl
        name={field}
        type="text"
        key={`${store.key_prefix}-${field}`}
        value={value}
        onChange={handleFieldChanged(store, field, 'text', element.type)}
      />
    </FormGroup>
  );
}

export {
  selectInput, multiSelectInput, textInput, multipleInputGroups,
  textareaInput, dateTimePickerInput, headlineWithToggle,
  operatorInput, annotationButton, checkboxInput, componentInput,
  identifierMultipleInputGroups,
}

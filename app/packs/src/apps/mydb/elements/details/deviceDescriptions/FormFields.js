import React from 'react';
import {
  FormGroup, ControlLabel, FormControl, InputGroup,
  OverlayTrigger, Tooltip, Button, Modal, ListGroup, ListGroupItem,
} from 'react-bootstrap';
import Select from 'react-select3';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import OntologySelect from './OntologySelect';

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

const addOntology = (selectedData, paths, store, element) => {
  const newOntology = { data: selectedData, paths: paths };
  const ontologies = element['ontologies'] || [];

  const value = ontologies.concat(newOntology);
  store.changeDeviceDescription('ontologies', value);
  store.toggleOntologyModal();
}

const deleteOntology = (store, element, i) => {
  if (!element['ontologies']) { return }

  element['ontologies'].splice(i, (i >= 0 ? 1 : 0));
  store.changeDeviceDescription('ontologies', element['ontologies']);
}

const ontologyModal = (store, element) => {
  return (
    <Modal backdrop="static" show={store.show_ontology_modal} onHide={() => store.toggleOntologyModal()}>
      <Modal.Header closeButton>
        <Modal.Title>Select Ontology</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <OntologySelect fnSelected={addOntology} store={store} element={element} />
      </Modal.Body>
    </Modal>
  );
}

const addOntologyButton = (store, element) => {
  return (
    <>
      <Button
        bsStyle="primary"
        bsSize="xsmall"
        className="add-row"
        onClick={() => store.toggleOntologyModal()}
      >
        <i className="fa fa-plus" />
      </Button>
      Add ontology
      {ontologyModal(store, element)}
    </>
  );
}

const deleteOntologyButton = (store, element, i) => {
  return (
    <Button
      bsSize="xsmall"
      bsStyle="danger"
      onClick={() => deleteOntology(store, element, i)}
      className="delete-in-list"
    >
      <i className="fa fa-trash-o" />
    </Button>
  );
}

const ontologiesList = (store, element, label, info) => {
  let list = [];
  let rows = [];

  if (element['ontologies']) {
    element['ontologies'].map((ontology, i) => {
      rows.push(
        <ListGroupItem header={ontology.data.label}>
          {ontology.paths.join(' / ')}
          {deleteOntologyButton(store, element, i)}
        </ListGroupItem>
      );
    });
    list.push(
      <ListGroup className="ontology-list">
        {rows}
      </ListGroup>
    );
  }

  return (
    <FormGroup key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <div>{addOntologyButton(store, element)}</div>
      {list}
    </FormGroup>
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
  }
  return value;
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
      <div className="grouped-fields-row cols-5">
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
  selectInput, textInput, multipleInputGroups,
  textareaInput, dateTimePickerInput, headlineWithToggle,
  operatorInput, ontologiesList
}

import React from 'react';
import {
  InputGroup, OverlayTrigger, Tooltip, Button, Form, Row, Col, ToggleButton, ButtonGroup,
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import { useDrop } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import Dropzone from 'react-dropzone';
import { v4 as uuid } from 'uuid';

import { unitSystems } from 'src/components/staticDropdownOptions/units';
import { capitalizeWords } from 'src/utilities/textHelper';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import UIStore from 'src/stores/alt/stores/UIStore';

const inputByType = (object, field, index, formHelper, disabled) => {
  const fullFieldName = `${field}.${index}.${object.value}`
  switch (object.type) {
    case 'text':
      return formHelper.textInput(fullFieldName, '', disabled, object.info);
    case 'select':
      return formHelper.selectInput(fullFieldName, '', object.options, disabled, '', object.info);
  }
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

const elementField = (element, field) => {
  let fieldParts = field.split('.');
  return fieldParts.reduce((accumulator, currentValue) => accumulator?.[currentValue], element);
}

const errorMessage = (element, field) => {
  let fieldParts = `errors.${field}`.split('.');
  return fieldParts.reduce((accumulator, currentValue) => accumulator?.[currentValue], element);
}

const optionsByRelatedField = (store, element, field, options) => {
  const relatedOptions = options.filter((o) => o.related !== undefined);
  if (relatedOptions.length < 1) { return options; }

  const { lastObject, lastKey } = store.getLastObjectAndKeyByField(field, element);

  if (lastObject[relatedOptions[0].related] !== '' || lastObject[relatedOptions[0].related] !== undefined) {
    return relatedOptions.filter((o) => o.only === lastObject[relatedOptions[0].related]);
  } else {
    return options;
  }
}

const numberValue = (value) => {
  if (value === '' || value === undefined) { return ''; }


  let cleanedValue = value;
  let changeToFloat = typeof cleanedValue === 'number';

  if (typeof value === 'string') {
    cleanedValue = value.replace(/[^0-9.,]/g, '').replace(/,/g, '.');

    const points = cleanedValue.split('.');
    cleanedValue = points.length > 2 ? `${points[0]}.${points[1]}` : cleanedValue;
    const lastChar = cleanedValue.charAt(cleanedValue.length - 1);
    changeToFloat = lastChar !== '.' && lastChar !== '0';
  }

  return changeToFloat ? parseFloat(cleanedValue) : cleanedValue;
}

const changeElement = (store, field, value, element_type) => {
  if (element_type == 'sequence_based_macromolecule_sample') {
    store.changeSequenceBasedMacromoleculeSample(field, value);
  }
}

const addRow = (store, element, field, rowFields) => {
  let newRow = {};
  rowFields.map((f) => {
    newRow[f.value] = '';
  });

  const fieldArray = elementField(element, field) || [];
  const value = fieldArray.concat(newRow);
  changeElement(store, field, value, element.type);
}

const deleteRow = (store, element, field, index) => {
  const fieldArray = elementField(element, field);
  fieldArray.splice(index, 1);
  changeElement(store, field, fieldArray, element.type);
}

const changeUnit = (store, element, units, unitField, unitValue) => {
  const activeUnitIndex = units.findIndex((f) => { return f.label === unitValue });
  const nextUnitIndex = activeUnitIndex === units.length - 1 ? 0 : activeUnitIndex + 1;
  const newUnitValue = units[nextUnitIndex].label;

  if (unitValue === newUnitValue) { return null; }

  changeElement(store, unitField, newUnitValue, element.type);
}

const initFormHelper = (element, store) => {
  const formHelper = {
    textInput: (field, label, disabled, info, required = false) => {
      const value = elementField(element, field);
      return (
        <Form.Group key={`${store.key_prefix}-${label}-group`}>
          {labelWithInfo(label, info)}
          <Form.Control
            name={field}
            type="text"
            key={`${store.key_prefix}-${field}`}
            value={value || ''}
            disabled={disabled}
            required={required}
            controlId={`validation-${field}`}
            isInvalid={!value && errorMessage(element, field)}
            onChange={(event) => formHelper.onChange(field, event.target.value)}
          />
          <Form.Control.Feedback type="invalid">{errorMessage(element, field)}</Form.Control.Feedback>
        </Form.Group>
      );
    },

    checkboxInput: (field, label, disabled) => {
      const value = elementField(element, field);
      return (
        <Form.Check
          type="checkbox"
          id={field}
          key={`${store.key_prefix}-${field}`}
          label={label}
          checked={value}
          disabled={disabled}
          onChange={(event) => formHelper.onChange(field, event.target.checked)}
        />
      );
    },

    selectInput: (field, label, options, disabled, info, required = false) => {
      const elementValue = elementField(element, field);
      const relatedOptions = optionsByRelatedField(store, element, field, options);
      let value = options.find((o) => { return o.value == elementValue });
      value = value === undefined ? '' : value;

      return (
        <Form.Group key={`${store.key_prefix}-${label}-group`}>
          {labelWithInfo(label, info)}
          <Select
            name={field}
            key={`${store.key_prefix}-${field}`}
            options={relatedOptions}
            value={value}
            isClearable={true}
            isDisabled={disabled}
            required={required}
            classNames={{
              control: (state) =>
                !state.hasValue && errorMessage(element, field) ? 'border-danger' : '',
            }}
            onChange={(event) => formHelper.onChange(field, (event?.value || event?.label || ''))}
          />
          {errorMessage(element, field) && (
            <div className="text-danger">{errorMessage(element, field)}</div>
          )}
        </Form.Group>
      );
    },

    numberInput: (field, label, disabled, info, required = false) => {
      const value = elementField(element, field);
      return (
        <Form.Group key={`${store.key_prefix}-${label}`}>
          {labelWithInfo(label, info)}
          <Form.Control
            name={field}
            type="text"
            key={`${store.key_prefix}-${field}`}
            value={numberValue(value)}
            disabled={disabled}
            required={required}
            isInvalid={!value && errorMessage(element, field)}
            onChange={(event) => formHelper.onChange(field, event.target.value)}
          />
          <Form.Control.Feedback type="invalid">{errorMessage(element, field)}</Form.Control.Feedback>
        </Form.Group>
      );
    },

    readonlyInput: (field, label, value, info) => {
      const fieldValue = !value ? elementField(element, field) : value;
      return (
        <Form.Group key={`${store.key_prefix}-${label}`}>
          {labelWithInfo(label, info)}
          <Form.Control
            name={field}
            type="text"
            key={`${store.key_prefix}-${field}`}
            value={fieldValue}
            disabled
            readOnly
          />
        </Form.Group>
      );
    },

    textareaInput: (field, label, rows, disabled, info, required = false) => {
      const value = elementField(element, field);
      return (
        <Form.Group key={`${store.key_prefix}-${label}`}>
          {labelWithInfo(label, info)}
          <Form.Control
            name={field}
            as="textarea"
            key={`${store.key_prefix}-${field}`}
            value={value || ''}
            rows={rows}
            disabled={disabled}
            required={required}
            isInvalid={!value && errorMessage(element, field)}
            onChange={(event) => formHelper.onChange(field, event.target.value)}
          />
          <Form.Control.Feedback type="invalid" className="fs-6">{errorMessage(element, field)}</Form.Control.Feedback>
        </Form.Group>
      );
    },

    inputGroupTextOrNumericInput: (field, label, text, type, disabled, info, required = false) => {
      let value = elementField(element, field);
      value = type == 'number' ? numberValue(value) : value || '';

      return (
        <Form.Group key={`${store.key_prefix}-${label}`}>
          {labelWithInfo(label, info)}
          <InputGroup key={`${store.key_prefix}-${label}-${text}`}>
            <InputGroup.Text key={`${store.key_prefix}-${text}`}>{text}</InputGroup.Text>
            <Form.Control
              name={field}
              type="text"
              key={`${store.key_prefix}-${field}`}
              value={value || ''}
              disabled={disabled}
              required={required}
              isInvalid={!value && errorMessage(element, field)}
              onChange={(event) => formHelper.onChange(field, event.target.value)}
            />
          </InputGroup>
          {errorMessage(element, field) && (
            <div className="text-danger">{errorMessage(element, field)}</div>
          )}
        </Form.Group>
      );
    },

    unitInput: (field, label, option_type, disabled, info, required = false) => {
      const value = numberValue(elementField(element, field));
      const units = unitSystems[option_type];
      if (!units) { return null; }

      const unitField = `${field.replace('_value', '')}_unit`;
      const unitValue = elementField(element, unitField) || units[0].label;

      let unitTextOrButton = (
        <InputGroup.Text key={`${store.key_prefix}-${units}`}>{units[0].label}</InputGroup.Text>
      );

      if (units.length > 1) {
        unitTextOrButton = (
          <Button
            key={`${units}-${field}-unit`}
            variant="success"
            onClick={() => changeUnit(store, element, units, unitField, unitValue)}
          >
            {unitValue}
          </Button>
        );
      }

      return (
        <Form.Group key={`${store.key_prefix}-${label}-${option_type}`}>
          {labelWithInfo(label, info)}
          <InputGroup key={`${store.key_prefix}-${label}-${field}`}>
            <Form.Control
              name={field}
              type="text"
              key={`${store.key_prefix}-${field}`}
              value={value || ''}
              disabled={disabled}
              required={required}
              isInvalid={!value && errorMessage(element, field)}
              onChange={(event) => formHelper.onChange(field, event.target.value, 'number')}
              className="flex-grow-1"
            />
            {unitTextOrButton}
          </InputGroup>
          {errorMessage(element, field) && (
            <div className="text-danger">{errorMessage(element, field)}</div>
          )}
        </Form.Group>
      );
    },

    addRowButton: (field, rowFields) => {
      return (
        <Button
          size="xxsm"
          variant="primary"
          onClick={() => addRow(store, element, field, rowFields)}
          className="me-2 mb-2"
        >
          <i className="fa fa-plus" />
        </Button>
      );
    },

    deleteRowButton: (field, i) => {
      return (
        <Button
          size="sm"
          variant="danger"
          onClick={() => deleteRow(store, element, field, i)}
          className="py-2"
        >
          <i className="fa fa-trash-o" />
        </Button>
      );
    },

    toggleButton: (fieldPrefix, field, fieldSuffix, buttonGroups) => {
      let groups = [];
      const { lastObject, lastKey } = store.getLastObjectAndKeyByField(fieldPrefix, element);

      buttonGroups.map((group, i) => {
        groups.push(
          <div key={`${field}-${group.label}-${i}-buttons`}>
            <div key={`${field}-${group.label}-${i}-label`} className="form-label">{group.label}</div>
            
            <ButtonGroup
              key={`${field}-${group.label}-${i}`}
              className="mb-4"
            >
              {
                group.options.map((option) => (
                  <ToggleButton
                    size="md"
                    variant="outline-primary"
                    id={`btn-check-${option.field}`}
                    type="checkbox"
                    value={option.field}
                    checked={lastObject[lastKey][option.field]}
                    onChange={(e) => store.setModificationToggleButtons(fieldPrefix, option.field, fieldSuffix, e.target.checked)}
                    key={`button-${option.field}-${i}`}
                  >
                    {option.label}
                  </ToggleButton>
                ))
              }
            </ButtonGroup>
          </div>
        );
      });

      return (
        <div className="d-flex gap-3" key={`${field}-groups`}>
          {groups}
        </div>
      );
    },

    multiToggleButtonsWithDetailField: (field, fieldPrefix, fieldSuffix, buttonGroups, headline, disabled) => {
      const buttons = formHelper.toggleButton(fieldPrefix, field, fieldSuffix, buttonGroups);
      const { lastObject, lastKey } = store.getLastObjectAndKeyByField(fieldPrefix, element);
      let details = [];

      buttonGroups.map((group, i) => {
        group.options.map((option) => {
          if (lastObject[lastKey][option.field]) {
            const ident = option.field.replace(/^.*?_/, '').replace('_enabled', '');
            details.push(
              <div className="mb-2" key={`detail-${ident}-${i}`}>
                {
                  formHelper.inputGroupTextOrNumericInput(
                    `${fieldPrefix}.${field}_${ident}_${fieldSuffix}`, '', capitalizeWords(ident), 'text', disabled, ''
                  )
                }
              </div>
            )
          };
        });
      });

      return (
        <Row>
          <Col className="mb-4">
            <h5 className="mb-3">{headline}</h5>
            {buttons}
            {
              details.length >= 1 && (
                <div key={`detail-fields`}>
                  <Form.Label>Details</Form.Label>
                  {details}
                </div>
              )
            }
          </Col>
        </Row>
      );
    },

    multipleRowInput: (field, rowFields, headline, disabled) => {
      let rows = [];
      let headerCols = [];
      let colWidth = Math.round(12 / rowFields.length);
      const fieldArray = elementField(element, field);

      if (fieldArray) {
        fieldArray.map((row, i) => {
          let fields = [];

          rowFields.map((entry, j) => {
            const col = j === 0 ? colWidth - 1 : colWidth;
            fields.push(
              <Col xs={col}>
                {inputByType(entry, field, i, formHelper, disabled)}
              </Col>
            );
          });

          rows.push(
            <Row className="mb-2" key={`${row}-${i}`}>
              <Col>
                {formHelper.deleteRowButton(field, i)}
              </Col>
              {fields}
            </Row>
          );
        });
      }

      rowFields.map((entry, j) => {
        const col = j === 0 ? colWidth - 1 : colWidth;
        headerCols.push(<Col xs={col} className="fw-bold">{entry.label}</Col>);
      });

      return (
        <div className="mb-4">
          <h5 className="mb-3">{headline}</h5>
          <Row className="border-bottom mb-3">
            <Col>
              {formHelper.addRowButton(field, rowFields)}
            </Col>
            {headerCols}
          </Row>
          {rows}
        </div>
      );
    },

    dropzone: (field, onDrop) => {
      return (
        <Dropzone onDrop={() => onDrop(field)} className="attachment-dropzone">
          Drop files here, or click to upload.
        </Dropzone>
      );
    },

    dropAreaForElement: (dropType, handleDrop, description) => {
      const [{ isOver, canDrop }, drop] = useDrop({
        accept: DragDropItemTypes[dropType],
        collect: (monitor) => ({
          isOver: monitor.isOver(),
          canDrop: monitor.canDrop(),
        }),
        drop: (item) => {
          handleDrop(item);
        },
      });

      return (
        <div
          key={`element-dropzone-${dropType}`}
          ref={(node) => drop(node)}
          className={`p-2 dnd-zone text-center text-gray-600 ${isOver && canDrop ? 'dnd-zone-over' : ''}`}
        >
          {description}
        </div>
      );
    },

    onChange: (field, value, type) => {
      const newValue = type && type === 'number' ? numberValue(value) : value;
      changeElement(store, field, newValue, element.type);
    },
  };
  return formHelper;
}

export { initFormHelper }

import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, InputGroup, Row, Col,
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import { convertUnits } from 'src/components/staticDropdownOptions/units';
import {
  HIERARCHICAL_PROPERTY_OPTIONS,
  FIELD_UNIT_OPTIONS,
  PROPERTY_MAP,
  LENGTH_UNIT_FIELDS,
} from 'src/utilities/hierarchicalPropertyConfig';

const TEMP_FIELDS = ['cspi'];

const convertTemperatureFromTo = (value, from, to) => {
  if (from === to) return value;
  const toKelvin = (v, u) => {
    if (u === 'K') return v;
    if (u === '°C') return v + 273.15;
    if (u === '°F') return ((v - 32) * 5) / 9 + 273.15;
    return v;
  };
  const fromKelvin = (v, u) => {
    if (u === 'K') return v;
    if (u === '°C') return v - 273.15;
    if (u === '°F') return ((v - 273.15) * 9) / 5 + 32;
    return v;
  };
  return parseFloat(fromKelvin(toKelvin(value, from), to).toFixed(4));
};

const stateOptions = [
  { value: 'solid_powder', label: 'Solid Powder' },
  { value: 'solid_pellet', label: 'Solid Pellet' },
  { value: 'solid_monolith', label: 'Solid Monolith' },
  { value: 'solid_shape', label: 'Solid Shape' },
  { value: 'liquid_colloidal', label: 'Liquid Colloidal' },
  { value: 'liquid_solution', label: 'Liquid Solution' },
];

function getSelectedHierarchicalProperties(sample) {
  const stored = sample.sample_details?.selected_properties;
  if (Array.isArray(stored)) return stored;
  return HIERARCHICAL_PROPERTY_OPTIONS
    .map((opt) => opt.value)
    .filter((key) => {
      const v = sample[key] ?? sample.sample_details?.[key];
      return v !== undefined && v !== null && v !== '';
    });
}

function FieldWithUnit({
  sample, fieldKey, label, unitOptions, defaultUnit, onFieldChange, onUnitChange,
}) {
  const details = sample.sample_details || {};
  const value = sample[fieldKey] ?? details[fieldKey] ?? '';
  const unit = details[`${fieldKey}_unit`] ?? defaultUnit;
  const cycleUnit = () => {
    const idx = unitOptions.findIndex((u) => u.value === unit);
    const nextUnit = unitOptions[(idx + 1) % unitOptions.length].value;
    onUnitChange(fieldKey, nextUnit);
  };
  return (
    <Form.Group className="w-100">
      <Form.Label>{label}</Form.Label>
      <div className="numeral-input-with-units">
        <InputGroup className="d-flex flex-nowrap align-items-center w-100">
          <Form.Control
            type="text"
            value={value}
            disabled={!sample.can_update}
            placeholder={PROPERTY_MAP[fieldKey]?.placeholder}
            className="flex-grow-1"
            onChange={(e) => onFieldChange(fieldKey, e.target.value)}
          />
          <Button
            variant="light"
            disabled={!sample.can_update}
            onClick={cycleUnit}
            className="px-1"
          >
            {unit}
          </Button>
        </InputGroup>
      </div>
    </Form.Group>
  );
}

FieldWithUnit.propTypes = {
  sample: PropTypes.object.isRequired,
  fieldKey: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  unitOptions: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string })).isRequired,
  defaultUnit: PropTypes.string.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onUnitChange: PropTypes.func.isRequired,
};

function HierarchicalPropertyInput({
  sample, fieldKey, onFieldChange, onUnitChange,
}) {
  const prop = PROPERTY_MAP[fieldKey];
  const unitOptions = FIELD_UNIT_OPTIONS[fieldKey];
  if (unitOptions) {
    return (
      <FieldWithUnit
        sample={sample}
        fieldKey={fieldKey}
        label={prop.label}
        unitOptions={unitOptions}
        defaultUnit={unitOptions[0].value}
        onFieldChange={onFieldChange}
        onUnitChange={onUnitChange}
      />
    );
  }
  const details = sample.sample_details || {};
  const value = sample[fieldKey] ?? details[fieldKey] ?? '';
  return (
    <Form.Group>
      <Form.Label>{prop.label}</Form.Label>
      <Form.Control
        type="text"
        value={value}
        disabled={!sample.can_update}
        placeholder={prop.placeholder}
        onChange={(e) => onFieldChange(fieldKey, e.target.value)}
      />
    </Form.Group>
  );
}

HierarchicalPropertyInput.propTypes = {
  sample: PropTypes.object.isRequired,
  fieldKey: PropTypes.string.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onUnitChange: PropTypes.func.isRequired,
};

export default function HierarchicalMaterialSection({
  sample,
  onSampleChanged,
  moleculeInput,
  infoButton,
  sampleAmount,
  compositionTable,
}) {
  const selectedKeys = getSelectedHierarchicalProperties(sample);

  const handleFieldChange = (field, value) => {
    sample[field] = value;
    onSampleChanged(sample);
  };

  const handleUnitChange = (field, newUnit) => {
    const details = { ...(sample.sample_details || {}) };
    const unitKey = `${field}_unit`;
    const oldUnit = details[unitKey];

    if (LENGTH_UNIT_FIELDS.includes(field) && oldUnit && oldUnit !== newUnit) {
      const currentVal = parseFloat(sample[field] ?? details[field]);
      if (!Number.isNaN(currentVal)) {
        const converted = convertUnits(currentVal, oldUnit, newUnit);
        sample[field] = converted;
        details[field] = converted;
      }
    } else if (TEMP_FIELDS.includes(field) && oldUnit && oldUnit !== newUnit) {
      const currentVal = parseFloat(sample[field] ?? details[field]);
      if (!Number.isNaN(currentVal)) {
        const converted = convertTemperatureFromTo(currentVal, oldUnit, newUnit);
        sample[field] = converted;
        details[field] = converted;
      }
    }

    details[unitKey] = newUnit;
    sample.sample_details = details;
    onSampleChanged(sample);
  };

  const handlePropertySelectionChanged = (selectedOptions) => {
    const selectedValues = (selectedOptions || []).map((opt) => opt.value);
    sample.sample_details = {
      ...(sample.sample_details || {}),
      selected_properties: selectedValues,
    };
    onSampleChanged(sample);
  };

  const handleStateChanged = (value) => {
    sample.state = value;
    onSampleChanged(sample);
  };

  const selectedOptions = HIERARCHICAL_PROPERTY_OPTIONS.filter(
    (opt) => selectedKeys.includes(opt.value),
  );
  return (
    <>
      <h5 className="mt-4">Hierarchical material information:</h5>
      <Row className="align-items-end mb-4">
        <Col>{moleculeInput}</Col>
        <Col xs={4} className="d-flex align-items-end gap-2">
          {infoButton}
          {sampleAmount}
        </Col>
      </Row>

      <Row className="align-items-end mb-4">
        <Col xs={3}>
          <Form.Group controlId="hierarchicalStateSelect">
            <Form.Label>State</Form.Label>
            <Form.Select
              onChange={(e) => handleStateChanged(e.target.value)}
              value={sample.state || ''}
              disabled={!sample.can_update}
            >
              <option value="">Select a state</option>
              {stateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col>
          <Form.Group>
            <Form.Label>Additional Properties</Form.Label>
            <Select
              isMulti
              name="hierarchicalProperties"
              isDisabled={!sample.can_update}
              options={HIERARCHICAL_PROPERTY_OPTIONS}
              value={selectedOptions}
              onChange={handlePropertySelectionChanged}
              placeholder="Select properties to display..."
              closeMenuOnSelect={false}
            />
          </Form.Group>
        </Col>
      </Row>

      {selectedKeys.length > 0 && (
        <Row className="mb-4">
          {selectedKeys.map((key) => (
            <Col xs={3} key={key} className="mb-4">
              <HierarchicalPropertyInput
                sample={sample}
                fieldKey={key}
                onFieldChange={handleFieldChange}
                onUnitChange={handleUnitChange}
              />
            </Col>
          ))}
        </Row>
      )}

      <Row>{compositionTable}</Row>
    </>
  );
}

HierarchicalMaterialSection.propTypes = {
  sample: PropTypes.object.isRequired,
  onSampleChanged: PropTypes.func.isRequired,
  moleculeInput: PropTypes.node.isRequired,
  infoButton: PropTypes.node.isRequired,
  sampleAmount: PropTypes.node.isRequired,
  compositionTable: PropTypes.node.isRequired,
};

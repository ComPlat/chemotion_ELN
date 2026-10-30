import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, InputGroup, Row, Col,
} from 'react-bootstrap';
import { Select, CreatableSelect } from 'src/components/common/Select';
import { convertUnits } from 'src/components/staticDropdownOptions/units';
import {
  HIERARCHICAL_PROPERTY_OPTIONS,
  FIELD_UNIT_OPTIONS,
  FIELD_DROPDOWN_OPTIONS,
  PROPERTY_MAP,
  LENGTH_UNIT_FIELDS,
} from 'src/utilities/hierarchicalPropertyConfig';

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
      if (key === 'dispersion') return sample.dispersion != null && sample.dispersion !== '';
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
  const dropdownOptions = FIELD_DROPDOWN_OPTIONS[fieldKey];
  const unitOptions = FIELD_UNIT_OPTIONS[fieldKey];

  if (dropdownOptions) {
    const details = sample.sample_details || {};
    const rawValue = sample[fieldKey] ?? details[fieldKey] ?? '';
    const selectedOption = rawValue
      ? (dropdownOptions.find((o) => o.value === rawValue) || { value: rawValue, label: rawValue })
      : null;
    return (
      <Form.Group>
        <Form.Label>{prop.label}</Form.Label>
        <CreatableSelect
          isClearable
          isDisabled={!sample.can_update}
          options={dropdownOptions}
          value={selectedOption}
          placeholder={prop.placeholder}
          onChange={(opt) => onFieldChange(fieldKey, opt ? opt.value : '')}
        />
      </Form.Group>
    );
  }

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
  const customProperties = (sample.sample_details || {}).custom_properties || [];

  const handleFieldChange = (field, value) => {
    sample[field] = value;
    const unitOptions = FIELD_UNIT_OPTIONS[field];
    if (unitOptions) {
      const details = { ...(sample.sample_details || {}) };
      const unitKey = `${field}_unit`;
      if (!details[unitKey]) {
        details[unitKey] = unitOptions[0].value;
        sample.sample_details = details;
      }
    }
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
    }

    details[unitKey] = newUnit;
    sample.sample_details = details;
    onSampleChanged(sample);
  };

  // Custom property chips use a __custom__N prefix so we can detect removal in onChange
  const customPropertyChips = customProperties
    .map((p, i) => ({ value: `__custom__${i}`, label: p.label }))
    .filter((c) => c.label);

  const handlePropertySelectionChanged = (opts) => {
    const nextOpts = opts || [];

    const standardValues = nextOpts
      .filter((o) => !o.value?.startsWith('__custom__'))
      .map((o) => o.value);

    // Detect removed custom property chips and remove them from the array
    const remainingCustomIndices = new Set(
      nextOpts
        .filter((o) => o.value?.startsWith('__custom__'))
        .map((o) => parseInt(o.value.replace('__custom__', ''), 10)),
    );
    const updatedCustomProps = customProperties.filter((_, i) => remainingCustomIndices.has(i));

    // eslint-disable-next-line react-hooks/immutability
    sample.sample_details = {
      ...(sample.sample_details || {}),
      selected_properties: standardValues,
      custom_properties: updatedCustomProps,
    };
    onSampleChanged(sample);
  };

  // Physical state lives in `xref.physical_state` — matching main's storage.
  const handleStateChanged = (value) => {
    // eslint-disable-next-line react-hooks/immutability
    sample.xref = { ...(sample.xref || {}), physical_state: value };
    onSampleChanged(sample);
  };

  // Dispersion (0–1) — stored as a direct DB column
  const dispersionValue = sample.dispersion ?? '';
  const dispersionNum = parseFloat(dispersionValue);
  const dispersionError = dispersionValue !== '' && !Number.isNaN(dispersionNum)
    && (dispersionNum < 0 || dispersionNum > 1);

  const handleDispersionChange = (e) => {
    // eslint-disable-next-line react-hooks/immutability
    sample.dispersion = e.target.value === '' ? null : parseFloat(e.target.value);
    onSampleChanged(sample);
  };

  const handleCustomPropertyChange = (idx, field, value) => {
    const updated = customProperties.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
    // eslint-disable-next-line react-hooks/immutability
    sample.sample_details = { ...(sample.sample_details || {}), custom_properties: updated };
    onSampleChanged(sample);
  };

  const handleCustomPropertyAdd = () => {
    const updated = [...customProperties, { label: '', value: '' }];
    // eslint-disable-next-line react-hooks/immutability
    sample.sample_details = { ...(sample.sample_details || {}), custom_properties: updated };
    onSampleChanged(sample);
  };

  const handleCustomPropertyRemove = (idx) => {
    const updated = customProperties.filter((_, i) => i !== idx);
    // eslint-disable-next-line react-hooks/immutability
    sample.sample_details = { ...(sample.sample_details || {}), custom_properties: updated };
    onSampleChanged(sample);
  };

  const selectedOptions = HIERARCHICAL_PROPERTY_OPTIONS.filter(
    (opt) => selectedKeys.includes(opt.value),
  );

  // All chips shown in the multi-select: standard selected + custom named properties
  const allSelectedValues = [...selectedOptions, ...customPropertyChips];

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
              value={sample.xref?.physical_state || ''}
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
              value={allSelectedValues}
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
              {key === 'dispersion' ? (
                <Form.Group controlId="hierarchicalDispersion">
                  <Form.Label>
                    Dispersion
                    {dispersionValue !== '' && !dispersionError && (
                      <span className="ms-2 text-muted" style={{ fontSize: '0.8em' }}>
                        {`${Math.round(dispersionNum * 100)}%`}
                      </span>
                    )}
                  </Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    <Form.Range
                      min="0"
                      max="1"
                      step="0.01"
                      value={dispersionError || dispersionValue === '' ? 0 : dispersionNum}
                      disabled={!sample.can_update}
                      onChange={handleDispersionChange}
                      className="flex-grow-1"
                    />
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={dispersionValue}
                      disabled={!sample.can_update}
                      placeholder="0–1"
                      onChange={handleDispersionChange}
                      isInvalid={dispersionError}
                      style={{ width: '5rem', flexShrink: 0 }}
                    />
                  </div>
                  {dispersionError && (
                    <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                      Must be between 0 and 1
                    </Form.Control.Feedback>
                  )}
                </Form.Group>
              ) : (
                <HierarchicalPropertyInput
                  sample={sample}
                  fieldKey={key}
                  onFieldChange={handleFieldChange}
                  onUnitChange={handleUnitChange}
                />
              )}
            </Col>
          ))}
        </Row>
      )}

      {/* User-defined properties: heading + Add button on same row, cards inline in grid */}
      {(customProperties.length > 0 || sample.can_update) && (
        <>
          <Row className="mb-3 align-items-center">
            <Col>
              <strong>User-defined properties</strong>
            </Col>
            {sample.can_update && (
              <Col xs="auto">
                <Button size="sm" variant="outline-secondary" onClick={handleCustomPropertyAdd}>
                  + Add property
                </Button>
              </Col>
            )}
          </Row>
          {customProperties.length > 0 && (
            <Row className="mb-4">
              {customProperties.map((prop, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <Col xs={3} key={`custom-${idx}`} className="mb-4">
                  <Form.Group style={{ position: 'relative' }}>
                    {sample.can_update && (
                      <Button
                        size="sm"
                        variant="link"
                        className="text-danger p-0 lh-1"
                        style={{
                          position: 'absolute', top: 0, right: 0, fontSize: '1rem', zIndex: 1,
                        }}
                        onClick={() => handleCustomPropertyRemove(idx)}
                      >
                        ×
                      </Button>
                    )}
                    <Form.Control
                      type="text"
                      size="sm"
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus={!prop.label}
                      value={prop.label}
                      placeholder="Property name"
                      disabled={!sample.can_update}
                      className="border-0 border-bottom rounded-0 px-0 fw-semibold"
                      style={{
                        background: 'transparent',
                        fontSize: '0.875rem',
                        boxShadow: 'none',
                        paddingRight: '1.25rem',
                      }}
                      onChange={(e) => handleCustomPropertyChange(idx, 'label', e.target.value)}
                    />
                    <Form.Control
                      type="text"
                      value={prop.value || ''}
                      disabled={!sample.can_update}
                      placeholder="Value"
                      className="mt-1"
                      onChange={(e) => handleCustomPropertyChange(idx, 'value', e.target.value)}
                    />
                  </Form.Group>
                </Col>
              ))}
            </Row>
          )}
        </>
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

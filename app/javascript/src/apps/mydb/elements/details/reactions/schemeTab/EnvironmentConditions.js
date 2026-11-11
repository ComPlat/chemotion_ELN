import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Collapse, Form, InputGroup, Row, Col
} from 'react-bootstrap';
import { ENVIRONMENT_UNITS, PRESSURE_UNITS, isEnvironmentNumber } from 'src/utilities/EnvironmentConditions';
import { normalizeNumberInput, handleNumberInputPaste } from 'src/utilities/MathUtils';
import { convertTemperature, convertGenericUnit } from 'src/utilities/MeasurementConversions';

// Normalize stored decimal commas only for conversion; keep the original reading intact.
const normalizeDecimalSeparator = (value) => `${value ?? ''}`.replace(',', '.');
const UNSUPPORTED_UNIT_HINT = 'Unsupported unit; reading is read-only.';
const REJECTED_INPUT_HINT = 'Input not accepted; previous value kept.';

const temperatureFieldHint = ({ value, unit }) => {
  const text = normalizeDecimalSeparator(value).trim();
  if (!isEnvironmentNumber(text)) { return null; }

  const minimum = { '°C': -273.15, '°F': -459.67, K: 0 }[unit || '°C'];
  return Number(text) < minimum ? 'Below absolute zero (0 K)' : null;
};

const humidityFieldHint = (value) => {
  const text = `${value ?? ''}`.trim();
  if (text === '') { return null; }

  const num = Number(text);
  return Number.isFinite(num) && num > 100 ? 'Usually 0 to 100%' : null;
};

// Toolbar toggle next to Status. The panel starts the scheme content, after any saved-reaction comments.
export const EnvironmentConditionsToggle = ({
  open, isSet, onToggle, panelId,
}) => (
  <Button
    variant={open ? 'primary' : 'outline-primary'}
    size="sm"
    className="d-inline-flex align-items-center gap-2"
    onClick={onToggle}
    aria-expanded={open}
    aria-controls={panelId}
  >
    <span>Environment conditions</span>
    {isSet && (
      <>
        <i
          className="fa fa-check-circle text-success"
          aria-hidden="true"
          title="Conditions entered"
        />
        <span className="visually-hidden">Conditions entered</span>
      </>
    )}
    <i className={`fa fa-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
  </Button>
);

EnvironmentConditionsToggle.propTypes = {
  open: PropTypes.bool.isRequired,
  isSet: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  panelId: PropTypes.string.isRequired,
};

// Collapsible panel with the temperature / humidity / air pressure inputs.
const EnvironmentConditionsPanel = ({
  open, environment, isDisabled, onChange, panelId,
}) => {
  const temperatureConversion = useRef(null);
  const pressureConversion = useRef(null);
  const editedFields = useRef(new Set());
  const [inputHints, setInputHints] = useState({});
  const isUnitSupported = (field) => {
    const unit = environment[field].unit || (field === 'air_pressure' ? 'mbar' : '');
    return !unit || ENVIRONMENT_UNITS[field].includes(unit);
  };

  const setFieldInputHint = (field, hint) => {
    setInputHints((previous) => ({ ...previous, [field]: hint }));
  };

  const renderFieldHint = (field) => {
    let readingHint = null;
    if (field === 'temperature') { readingHint = temperatureFieldHint(environment.temperature); }
    if (field === 'humidity') { readingHint = humidityFieldHint(environment.humidity.value); }
    const hint = isUnitSupported(field)
      ? inputHints[field] || readingHint
      : UNSUPPORTED_UNIT_HINT;
    return hint ? <Form.Text className="text-muted">{hint}</Form.Text> : null;
  };

  const updateField = (field, patch) => {
    setFieldInputHint(field, null);
    onChange({
      ...environment,
      [field]: { ...environment[field], ...patch },
    });
  };

  const changeValue = (field, raw, options = {}) => {
    if (!isUnitSupported(field)) { return; }

    const value = normalizeNumberInput(raw, { ...options, allowNegative: field === 'temperature' });
    if (value === null) {
      setFieldInputHint(field, REJECTED_INPUT_HINT);
      return;
    }

    if (field === 'temperature') { temperatureConversion.current = null; }
    if (field === 'air_pressure') { pressureConversion.current = null; }
    editedFields.current.add(field);
    updateField(field, { value });
  };

  const clearIncompleteValue = (field) => {
    if (!editedFields.current.delete(field) || !isUnitSupported(field)) { return; }

    const { value } = environment[field];
    if (value && !isEnvironmentNumber(value)) {
      updateField(field, { value: '' });
    }
  };

  const cycleTemperatureUnit = () => {
    const units = ENVIRONMENT_UNITS.temperature;
    const current = environment.temperature.unit || '°C';
    if (!units.includes(current)) { return; }

    const nextUnit = units[(units.indexOf(current) + 1) % units.length];
    const { value } = environment.temperature;
    const normalizedValue = normalizeDecimalSeparator(value);
    const isNumeric = isEnvironmentNumber(normalizedValue);
    if (normalizedValue.trim() !== '' && !isNumeric) { return; }

    let nextValue = value;
    if (isNumeric) {
      const previous = temperatureConversion.current;
      // Always convert from the original measurement until the value is edited.
      const source = previous?.value === value && previous?.unit === current
        ? previous.source : { value, unit: current };
      const converted = convertTemperature(
        Number(normalizeDecimalSeparator(source.value)), source.unit, nextUnit
      );
      if (!Number.isFinite(converted)) { return; }

      nextValue = nextUnit === source.unit ? source.value
        : converted.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 12 });
      temperatureConversion.current = { source, value: nextValue, unit: nextUnit };
    }
    updateField('temperature', { value: nextValue, unit: nextUnit });
  };

  const pressureUnit = environment.air_pressure.unit || 'mbar';
  const pressureUnitLabel = PRESSURE_UNITS.find(({ key }) => key === pressureUnit)?.label || pressureUnit;

  const cyclePressureUnit = () => {
    const units = ENVIRONMENT_UNITS.air_pressure;
    if (!units.includes(pressureUnit)) { return; }

    const nextUnit = units[(units.indexOf(pressureUnit) + 1) % units.length];

    const value = environment.air_pressure.value ?? '';
    const normalizedValue = normalizeDecimalSeparator(value);
    const isNumeric = isEnvironmentNumber(normalizedValue);
    if (normalizedValue.trim() !== '' && !isNumeric) { return; }

    let nextValue = value;
    if (isNumeric) {
      const previous = pressureConversion.current;
      const source = previous?.value === value && previous?.unit === pressureUnit
        ? previous.source : { value, unit: pressureUnit };
      // Convert from the original reading with the library factors to avoid rounding drift.
      const converted = convertGenericUnit(
        Number(normalizeDecimalSeparator(source.value)), source.unit, nextUnit, 'pressure'
      );
      if (converted === null || !Number.isFinite(converted)) { return; }

      nextValue = nextUnit === source.unit ? source.value
        : converted.toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 15 });
      pressureConversion.current = { source, value: nextValue, unit: nextUnit };
    }
    updateField('air_pressure', { value: nextValue, unit: nextUnit });
  };

  return (
    <Collapse in={open}>
      <div id={panelId} className="environment-conditions mt-2 mb-2">
        <Row className="g-2">
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small mb-1">Ambient temperature</Form.Label>
              <InputGroup size="sm">
                <Form.Control
                  type="text"
                  aria-label="Ambient temperature"
                  readOnly={!isUnitSupported('temperature')}
                  value={environment.temperature.value ?? ''}
                  placeholder="value"
                  disabled={isDisabled}
                  onChange={(e) => changeValue('temperature', e.target.value)}
                  onPaste={(e) => handleNumberInputPaste(e, (raw, options) => changeValue('temperature', raw, options))}
                  onBlur={() => clearIncompleteValue('temperature')}
                />
                <Button
                  variant="light"
                  disabled={isDisabled || !isUnitSupported('temperature')}
                  onClick={cycleTemperatureUnit}
                  aria-label="Toggle temperature unit"
                >
                  {environment.temperature.unit || '°C'}
                </Button>
              </InputGroup>
              {renderFieldHint('temperature')}
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small mb-1">Humidity</Form.Label>
              <InputGroup size="sm">
                <Form.Control
                  type="text"
                  aria-label="Humidity"
                  readOnly={!isUnitSupported('humidity')}
                  value={environment.humidity.value ?? ''}
                  placeholder="value"
                  disabled={isDisabled}
                  onChange={(e) => changeValue('humidity', e.target.value)}
                  onPaste={(e) => handleNumberInputPaste(e, (raw, options) => changeValue('humidity', raw, options))}
                  onBlur={() => clearIncompleteValue('humidity')}
                />
                <InputGroup.Text>{environment.humidity.unit || '%'}</InputGroup.Text>
              </InputGroup>
              {renderFieldHint('humidity')}
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group as="fieldset" disabled={isDisabled}>
              <Form.Label className="small mb-1">Air pressure</Form.Label>
              <InputGroup size="sm">
                <Form.Control
                  type="text"
                  aria-label="Air pressure"
                  readOnly={!isUnitSupported('air_pressure')}
                  value={environment.air_pressure.value ?? ''}
                  placeholder="value"
                  disabled={isDisabled}
                  onChange={(e) => changeValue('air_pressure', e.target.value)}
                  onPaste={(e) => handleNumberInputPaste(e, (raw, options) => (
                    changeValue('air_pressure', raw, options)
                  ))}
                  onBlur={() => clearIncompleteValue('air_pressure')}
                />
                {isUnitSupported('air_pressure') ? (
                  <Button
                    variant="light"
                    disabled={isDisabled}
                    onClick={cyclePressureUnit}
                    aria-label="Toggle air pressure unit"
                  >
                    {pressureUnitLabel}
                  </Button>
                ) : <InputGroup.Text>{pressureUnit}</InputGroup.Text>}
              </InputGroup>
              {renderFieldHint('air_pressure')}
            </Form.Group>
          </Col>
        </Row>
      </div>
    </Collapse>
  );
};

EnvironmentConditionsPanel.propTypes = {
  open: PropTypes.bool.isRequired,
  environment: PropTypes.shape({
    temperature: PropTypes.shape({ value: PropTypes.string, unit: PropTypes.string }),
    humidity: PropTypes.shape({ value: PropTypes.string, unit: PropTypes.string }),
    air_pressure: PropTypes.shape({ value: PropTypes.string, unit: PropTypes.string }),
  }).isRequired,
  isDisabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  panelId: PropTypes.string,
};

export default EnvironmentConditionsPanel;

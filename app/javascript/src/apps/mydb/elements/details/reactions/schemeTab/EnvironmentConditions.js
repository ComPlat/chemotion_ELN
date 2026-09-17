import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Collapse, Form, InputGroup, Row, Col
} from 'react-bootstrap';

import { convertTemperature } from 'src/models/Reaction';

const TEMPERATURE_UNITS = ['°C', '°F', 'K'];

// Local numeric-ish check: only convert a value that is a signed decimal so a partially
// typed entry ("-", "1.") round-trips through a unit toggle unchanged.
const isConvertibleNumber = (text) => /^-?\d*\.?\d+$/.test(`${text}`.trim());

// Restrict typed input to a number, mirroring the reaction Vessel size field: convert a
// decimal comma to a dot, drop every non-numeric character, and keep a single decimal point.
// Temperature additionally keeps a leading minus sign, since sub-zero values are valid.
const normalizeNumberInput = (raw, { allowNegative = false } = {}) => {
  const negative = allowNegative && `${raw}`.trim().startsWith('-');
  let value = `${raw}`.replace(',', '.').replace(/[^0-9.]/g, '');
  const dotIndex = value.indexOf('.');
  if (dotIndex !== -1) {
    value = value.substring(0, dotIndex + 1) + value.substring(dotIndex + 1).replace(/\./g, '');
  }
  return negative ? `-${value}` : value;
};

// Soft, non-blocking guidance shown as muted helper text. Numeric-only input already blocks
// letters and (for humidity / air pressure) negatives, so this only gently nudges when a
// value lands outside its usual physical range; it never blocks saving.
const ENVIRONMENT_HINTS = {
  humidity: (num) => (num > 100 ? 'Usually 0 to 100%' : null),
};

const environmentFieldHint = (field, value) => {
  const hint = ENVIRONMENT_HINTS[field];
  const text = `${value ?? ''}`.trim();
  if (!hint || text === '') { return null; }
  const num = Number(text);
  return Number.isFinite(num) ? hint(num) : null;
};

// Toolbar toggle: sits next to the Status field, opens/closes the panel below the toolbar.
export const EnvironmentConditionsToggle = ({
  open, isSet, onToggle,
}) => (
  <Button
    variant={open ? 'primary' : 'outline-primary'}
    size="sm"
    className="d-inline-flex align-items-center gap-2"
    onClick={onToggle}
    aria-expanded={open}
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
};

// Collapsible panel with the temperature / humidity / air pressure inputs.
const EnvironmentConditionsPanel = ({
  open, environment, isDisabled, onChange,
}) => {
  const updateField = (field, patch) => {
    onChange({
      ...environment,
      [field]: { ...environment[field], ...patch },
    });
  };

  const cycleTemperatureUnit = () => {
    const current = environment.temperature.unit || '°C';
    const nextUnit = TEMPERATURE_UNITS[(TEMPERATURE_UNITS.indexOf(current) + 1) % TEMPERATURE_UNITS.length];
    const { value } = environment.temperature;
    const nextValue = isConvertibleNumber(value)
      ? convertTemperature(value, current, nextUnit).toFixed(2)
      : value;
    updateField('temperature', { value: nextValue, unit: nextUnit });
  };

  return (
    <Collapse in={open}>
      <div className="environment-conditions mt-2 mb-3">
        <Row>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Temperature</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  aria-label="Temperature"
                  value={environment.temperature.value ?? ''}
                  placeholder="value"
                  disabled={isDisabled}
                  onChange={(e) => updateField('temperature', {
                    value: normalizeNumberInput(e.target.value, { allowNegative: true }),
                  })}
                />
                <Button
                  variant="light"
                  disabled={isDisabled}
                  onClick={cycleTemperatureUnit}
                  title="Toggle unit"
                >
                  {environment.temperature.unit || '°C'}
                </Button>
              </InputGroup>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Humidity</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  aria-label="Humidity"
                  value={environment.humidity.value ?? ''}
                  placeholder="value"
                  disabled={isDisabled}
                  onChange={(e) => updateField('humidity', { value: normalizeNumberInput(e.target.value) })}
                />
                <InputGroup.Text>{environment.humidity.unit || '%'}</InputGroup.Text>
              </InputGroup>
              {environmentFieldHint('humidity', environment.humidity.value) && (
                <Form.Text className="text-muted">
                  {environmentFieldHint('humidity', environment.humidity.value)}
                </Form.Text>
              )}
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Air pressure</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  aria-label="Air pressure"
                  value={environment.air_pressure.value ?? ''}
                  placeholder="value"
                  disabled={isDisabled}
                  onChange={(e) => updateField('air_pressure', { value: normalizeNumberInput(e.target.value) })}
                />
                <InputGroup.Text>{environment.air_pressure.unit || 'mbar'}</InputGroup.Text>
              </InputGroup>
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
};

export default EnvironmentConditionsPanel;

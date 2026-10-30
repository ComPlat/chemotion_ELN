import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Collapse, Form, InputGroup, Row, Col
} from 'react-bootstrap';
import { GenUnitBtn } from 'chem-generic-ui';

import { convertTemperature } from 'src/models/Reaction';
import { isEnvironmentNumber } from 'src/utilities/EnvironmentConditions';
import { normalizeNumberInput } from 'src/utilities/MathUtils';
import { convertGenericUnit }
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

const TEMPERATURE_UNITS = ['°C', '°F', 'K'];

// Soft, non-blocking guidance shown as muted helper text. Numeric-only input already blocks
// letters and (for humidity / air pressure) negatives, so this only gently nudges when a
// value lands outside its usual physical range; it never blocks saving.
const ENVIRONMENT_HINTS = {
  temperature: (num, unit) => {
    const minimum = { '°C': -273.15, '°F': -459.67, K: 0 }[unit];
    return num < minimum ? 'Below absolute zero' : null;
  },
  humidity: (num) => (num > 100 ? 'Usually 0 to 100%' : null),
};

const environmentFieldHint = (field, value, unit) => {
  const hint = ENVIRONMENT_HINTS[field];
  const text = `${value ?? ''}`.trim();
  if (!hint || text === '') { return null; }
  const num = Number(text);
  return Number.isFinite(num) ? hint(num, unit) : null;
};

// Toolbar toggle: sits next to the Status field, opens/closes the panel below the toolbar.
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

  const updateField = (field, patch) => {
    onChange({
      ...environment,
      [field]: { ...environment[field], ...patch },
    });
  };

  const clearIncompleteValue = (field) => {
    const { value } = environment[field];
    if (value && !isEnvironmentNumber(value)) {
      updateField(field, { value: '' });
    }
  };

  const cycleTemperatureUnit = () => {
    const current = environment.temperature.unit || '°C';
    if (!TEMPERATURE_UNITS.includes(current)) { return; }

    const nextUnit = TEMPERATURE_UNITS[(TEMPERATURE_UNITS.indexOf(current) + 1) % TEMPERATURE_UNITS.length];
    const { value } = environment.temperature;
    let nextValue = value;
    if (isEnvironmentNumber(value)) {
      const previous = temperatureConversion.current;
      // Always convert from the original measurement until the value is edited.
      const source = previous?.value === value && previous?.unit === current
        ? previous.source : { value, unit: current };
      nextValue = nextUnit === source.unit ? source.value
        : `${Number(convertTemperature(source.value, source.unit, nextUnit).toFixed(12))}`;
      temperatureConversion.current = { source, value: nextValue, unit: nextUnit };
    }
    updateField('temperature', { value: nextValue, unit: nextUnit });
  };

  const pressure = {
    type: 'system-defined',
    measurable_quantity: 'pressure',
    unit: environment.air_pressure.unit || 'mbar',
    values: [environment.air_pressure.value ?? ''],
  };

  const changePressureUnit = (updated) => {
    const [value] = pressure.values;
    let nextValue = value;
    if (isEnvironmentNumber(value)) {
      const previous = pressureConversion.current;
      const source = previous?.value === value && previous?.unit === pressure.unit
        ? previous.source : { value, unit: pressure.unit };
      // GenUnitBtn rounds each conversion to five decimal places. Convert from the
      // original reading with its unit metadata to preserve small pressure values.
      const converted = convertGenericUnit(Number(source.value), source.unit, updated.unit, 'pressure');
      if (converted === null || !Number.isFinite(converted)) { return; }

      nextValue = updated.unit === source.unit ? source.value
        : converted.toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 15 });
      pressureConversion.current = { source, value: nextValue, unit: updated.unit };
    }
    updateField('air_pressure', { value: nextValue, unit: updated.unit });
  };

  return (
    <Collapse in={open}>
      <div id={panelId} className="environment-conditions mt-2 mb-3">
        <Row>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Ambient temperature</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  aria-label="Ambient temperature"
                  value={environment.temperature.value ?? ''}
                  placeholder="value"
                  disabled={isDisabled}
                  onChange={(e) => {
                    temperatureConversion.current = null;
                    updateField('temperature', {
                      value: normalizeNumberInput(e.target.value, { allowNegative: true }),
                    });
                  }}
                  onBlur={() => clearIncompleteValue('temperature')}
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
              {environmentFieldHint('temperature', environment.temperature.value, environment.temperature.unit) && (
                <Form.Text className="text-muted">
                  {environmentFieldHint('temperature', environment.temperature.value, environment.temperature.unit)}
                </Form.Text>
              )}
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
                  onBlur={() => clearIncompleteValue('humidity')}
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
            <Form.Group as="fieldset" disabled={isDisabled}>
              <Form.Label>Air pressure</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  aria-label="Air pressure"
                  value={environment.air_pressure.value ?? ''}
                  placeholder="value"
                  disabled={isDisabled}
                  onChange={(e) => {
                    pressureConversion.current = null;
                    updateField('air_pressure', { value: normalizeNumberInput(e.target.value) });
                  }}
                  onBlur={() => clearIncompleteValue('air_pressure')}
                />
                <GenUnitBtn
                  generic={pressure}
                  variant="light"
                  size={null}
                  fnCb={changePressureUnit}
                />
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
  panelId: PropTypes.string,
};

export default EnvironmentConditionsPanel;

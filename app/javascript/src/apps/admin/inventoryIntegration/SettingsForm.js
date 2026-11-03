import React from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';

const SECRET = 'x-secret';

function typedValue(property, raw) {
  if (property.type === 'boolean') return raw;
  if (raw === '') return undefined;
  if (property.type === 'integer') return parseInt(raw, 10);
  if (property.type === 'number') return parseFloat(raw);
  return raw;
}

// Inputs for an adapter's settings schema. Secret fields (x-secret) are write-only credentials:
// a stored secret is never shown, and leaving its field empty keeps it.
const SettingsForm = ({
  schema, settings, credentials, credentialsSet, secretsFromIt, onChange,
}) => {
  const properties = schema?.properties || {};
  const required = schema?.required || [];

  const update = (name, property, raw) => {
    const value = typedValue(property, raw);
    if (property[SECRET]) {
      onChange({ settings, credentials: { ...credentials, [name]: value } });
    } else {
      const next = { ...settings, [name]: value };
      if (value === undefined) delete next[name];
      onChange({ settings: next, credentials });
    }
  };

  const control = (name, property) => {
    const value = (property[SECRET] ? credentials[name] : settings[name]) ?? '';
    if (property.enum) {
      return (
        <Form.Select value={value} onChange={(e) => update(name, property, e.target.value)}>
          <option value="">-</option>
          {property.enum.map((option) => <option key={option} value={option}>{option}</option>)}
        </Form.Select>
      );
    }
    if (property.type === 'boolean') {
      return (
        <Form.Check
          type="checkbox"
          checked={value === true}
          onChange={(e) => update(name, property, e.target.checked)}
        />
      );
    }
    return (
      <Form.Control
        type={property[SECRET] ? 'password' : (['integer', 'number'].includes(property.type) && 'number') || 'text'}
        autoComplete="off"
        value={value}
        placeholder={property[SECRET] && credentialsSet ? 'Stored; leave empty to keep' : undefined}
        onChange={(e) => update(name, property, e.target.value)}
      />
    );
  };

  return (
    <>
      {Object.entries(properties)
        .filter(([, property]) => !(property[SECRET] && secretsFromIt))
        .map(([name, property]) => (
          <Form.Group className="mb-2" key={name} controlId={`setting-${name}`}>
            <Form.Label>
              {property.title || name}
              {required.includes(name) && !property[SECRET] && ' *'}
            </Form.Label>
            {control(name, property)}
            {property.description && <Form.Text>{property.description}</Form.Text>}
          </Form.Group>
        ))}
    </>
  );
};

SettingsForm.propTypes = {
  schema: PropTypes.shape({
    properties: PropTypes.objectOf(PropTypes.object),
    required: PropTypes.arrayOf(PropTypes.string),
  }),
  settings: PropTypes.objectOf(PropTypes.any).isRequired,
  credentials: PropTypes.objectOf(PropTypes.any).isRequired,
  credentialsSet: PropTypes.bool,
  secretsFromIt: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

SettingsForm.defaultProps = {
  schema: null,
  credentialsSet: false,
  secretsFromIt: false,
};

export default SettingsForm;

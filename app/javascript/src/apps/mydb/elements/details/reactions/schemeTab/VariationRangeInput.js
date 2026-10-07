import React from 'react';
import PropTypes from 'prop-types';
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';

/*
What a Scheme tab field shows where the reaction's variations do not agree on its value: their range,
which cannot be edited there. A range is often longer than the field is wide, so the full range is in
a tooltip, along with anything the field's own tooltip would have said (`hint`).

The input is read-only rather than disabled, and styled as disabled: a disabled input gets no mouse
events, so neither a tooltip nor a `title` would ever show on it.
*/
const VariationRangeInput = ({
  text, fullText, unit, hint, size, name, className,
}) => {
  const range = `${fullText ?? text}${unit ? ` ${unit}` : ''}`;
  return (
    <OverlayTrigger
      overlay={(
        <Tooltip id="variation-range-tooltip">
          {`Variations: ${range}`}
          {hint && <div>{hint}</div>}
        </Tooltip>
      )}
    >
      <Form.Control
        type="text"
        readOnly
        size={size}
        value={text}
        name={name}
        aria-label={`Variations: ${range}`}
        className={['variation-range-input', className].filter(Boolean).join(' ')}
      />
    </OverlayTrigger>
  );
};

VariationRangeInput.propTypes = {
  text: PropTypes.string.isRequired,
  fullText: PropTypes.string,
  unit: PropTypes.string,
  hint: PropTypes.string,
  size: PropTypes.string,
  name: PropTypes.string,
  className: PropTypes.string,
};

VariationRangeInput.defaultProps = {
  fullText: null,
  unit: '',
  hint: null,
  size: undefined,
  name: undefined,
  className: 'flex-grow-1',
};

export default VariationRangeInput;

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { InputGroup, Form } from 'react-bootstrap';

export default class TextRangeWithAddon extends Component {
  handleInputChange(e) {
    const input = e.target;
    input.focus();
    const { value, selectionStart } = input;
    let newValue = value;
    const lastChar = value[selectionStart - 1] || '';
    if (lastChar !== '' && !lastChar.match(/-|\d|\.| |(,)/)) {
      const reg = new RegExp(lastChar, 'g');
      newValue = newValue.replace(reg, '');
      this.input.value = newValue;
      return;
    }
    newValue = newValue.replace(/--/g, '');
    newValue = newValue.replace(/,/g, '.');
    newValue = newValue.replace(/\.+\./g, '.');
    newValue = newValue.replace(/ - /g, ' ');
    this.props.onChange(this.props.field, newValue, newValue);
  }

  handleInputFocus() {
    this.input.value = this.input.value.trim().replace(/ – /g, ' ');
  }

  handleInputBlur() {
    const value = this.input.value.trim();
    const result = value.match(/[-.0-9]+|[0-9]/g);
    if (result) {
      // eslint-disable-next-line no-restricted-globals
      const nums = result.filter(r => !isNaN(r));
      if (nums.length > 0) {
        let lower = null;
        let upper = null;
        if (nums.length === 1) {
          lower = nums.shift();
          upper = lower;
        } else {
          lower = nums.shift();
          upper = nums.pop();
        }
        this.props.onChange(this.props.field, Number.parseFloat(lower), Number.parseFloat(upper));
      } else {
        this.input.value = '';
        this.props.onChange(this.props.field, '', '');
      }
    } else {
      this.props.onChange(this.props.field, '', '');
    }
  }

  render() {
    const {
      addon, disabled, label, tipOnText, value,
      alternativeActive, alternativeLabel, alternativeToggleLabel,
      alternativeToggleTooltip, onAlternativeToggle, field
    } = this.props;

    const showAlternative = Boolean(alternativeActive);
    const inputValue = showAlternative ? alternativeLabel : value;
    const inputDisabled = disabled || showAlternative;

    return (
      <Form.Group size="sm">
        <Form.Label>{label}</Form.Label>
        <InputGroup data-cy={"cy_"+label}>
          <Form.Control
            title={showAlternative ? alternativeLabel : tipOnText}
            type="text"
            disabled={inputDisabled}
            value={inputValue}
            ref={(ref) => { this.input = ref; }}
            onChange={(event) => this.handleInputChange(event)}
            onFocus={() => this.handleInputFocus()}
            onBlur={() => this.handleInputBlur()}
          />
          {!showAlternative && <InputGroup.Text>{addon}</InputGroup.Text>}
        </InputGroup>
        {alternativeToggleLabel && onAlternativeToggle && (
          <div className="mt-1">
            <Form.Check
              type="checkbox"
              id={`alt_toggle_${field}`}
              checked={showAlternative}
              disabled={disabled}
              label={alternativeToggleLabel}
              title={alternativeToggleTooltip || alternativeToggleLabel}
              onChange={(e) => onAlternativeToggle(e.target.checked)}
              className="text-range-alternative-checkbox"
            />
          </div>
        )}
      </Form.Group>
    );
  }
}

TextRangeWithAddon.propTypes = {
  field: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.string,
  addon: PropTypes.string,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  tipOnText: PropTypes.string,
  alternativeActive: PropTypes.bool,
  alternativeLabel: PropTypes.string,
  alternativeToggleLabel: PropTypes.string,
  alternativeToggleTooltip: PropTypes.string,
  onAlternativeToggle: PropTypes.func,
};

TextRangeWithAddon.defaultProps = {
  label: '',
  value: '',
  addon: '',
  disabled: false,
  onChange: () => {},
  tipOnText: '',
  alternativeActive: false,
  alternativeLabel: '',
  alternativeToggleLabel: '',
  alternativeToggleTooltip: '',
  onAlternativeToggle: null,
};

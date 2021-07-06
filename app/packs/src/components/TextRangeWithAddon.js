import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormGroup, InputGroup, FormControl } from 'react-bootstrap';

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
    this.input.value = newValue;
  }

  handleInputFocus() {
    this.input.value = this.input.value.trim().replace(/ – /g, ' ');
  }

  handleInputBlur() {
    this.input.value = this.input.value.trim();
    const result = this.input.value.match(/[-.0-9]+|[0-9]/g);
    if (result) {
      // eslint-disable-next-line no-restricted-globals
      const nums = result.filter(r => !isNaN(r));
      if (nums.length > 0) {
        let lower = null;
        let upper = null;
        if (nums.length === 1) {
          lower = nums.shift();
          upper = lower;
          this.input.value = Number.parseFloat(lower).toString();
        } else {
          lower = nums.shift();
          upper = nums.pop();
          this.input.value = (Number.parseFloat(lower).toString().concat(' – ', Number.parseFloat(upper))).trim();
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
      addon, disabled, label, tipOnText
    } = this.props;
    return (
      <FormGroup bsSize="small">
        <ControlLabel>{label}</ControlLabel>
        <InputGroup>
          <FormControl
            title={tipOnText}
            type="text"
            disabled={disabled}
            defaultValue={this.props.value || ''}
            inputRef={(ref) => { this.input = ref; }}
            onChange={event => this.handleInputChange(event)}
            onFocus={() => this.handleInputFocus()}
            onBlur={() => this.handleInputBlur()}
          />
          <InputGroup.Addon>{addon}</InputGroup.Addon>
        </InputGroup>
      </FormGroup>
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
  tipOnText: PropTypes.string
};

TextRangeWithAddon.defaultProps = {
  label: '',
  value: '',
  addon: '',
  disabled: false,
  onChange: () => {},
  tipOnText: ''
};

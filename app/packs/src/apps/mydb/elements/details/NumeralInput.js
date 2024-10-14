import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Numeral from 'numeral';
import { Form } from 'react-bootstrap';

export default class NumeralInput extends Component {
  constructor(props) {
    super(props);

    const { value } = props;
    this.state = {
      numeralValue: this._convertValueToNumeralValue(value)
    };
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { value } = nextProps;
    this.setState({
      numeralValue: this._convertValueToNumeralValue(value)
    });
  }

  _convertValueToNumeralValue(value) {
    try {
      const { numeralFormat } = this.props;
      return Numeral(value).format(numeralFormat);
    } catch (err) {
      console.log(`Error in NumeralInput component: ${err}`);
    }

    return null;
  }

  // TODO fix issue that cursor is behind, when numeral inserts a comma:
  // containing comas need to be compared to previous amount
  _handleInputValueChange(event) {
    const inputField = event.target;
    const { value, selectionStart } = inputField;
    const formatedValue = this._convertValueToNumeralValue(value);
    const unformatedValue = Numeral().unformat(formatedValue);
    const { onChange } = this.props;

    this.setState(
      { numeralValue: formatedValue },
      () => { inputField.selectionStart = selectionStart; }
    );
    onChange(unformatedValue);
  }

  render() {
    const { variant, disabled } = this.props;
    const { numeralValue } = this.state;

    return (
      <Form.Control
        type="text"
        style={{ width: 60 }}
        value={numeralValue || ''}
        variant={variant}
        disabled={disabled}
        onChange={(event) => this._handleInputValueChange(event)}
      />
    );
  }
}

NumeralInput.defaultProps = {
  disabled: false,
  variant: null,
};

NumeralInput.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  numeralFormat: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  variant: PropTypes.string,
};

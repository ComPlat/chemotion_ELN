import React, {Component} from 'react';
import Numeral from 'numeral';
import {Input} from 'react-bootstrap';

export default class NumeralInput extends Component {
  constructor(props) {
    super(props);

    let {value} = props;
    this.state = {
      numeralValue: this._convertValueToNumeralValue(value)
    };
  }

  componentWillReceiveProps(nextProps) {
    let {value} = nextProps;
    if (value) {
      this.setState({
        numeralValue: this._convertValueToNumeralValue(value)
      });
    }
  }

  _convertValueToNumeralValue(value) {
    let {numeralFormat} = this.props;
    return Numeral(value).format(numeralFormat);
  }

  //TODO fix issue that cursor is behind, when numeral inserts a comma:
  // containing comas need to be compared to previous amount
  _handleInputValueChange(event) {
    let inputField = event.target;
    let caretPosition = $(inputField).caret();
    let {value} = inputField;
    let unformatedValue = Numeral().unformat(value);
    let {onChange} = this.props;

    this.setState({
        numeralValue: this._convertValueToNumeralValue(value)
      }, () => {
        onChange(unformatedValue);
        $(inputField).caret(caretPosition);
      }
    );
  }

  render() {
    let {bsSize, bsStyle, addonAfter, buttonAfter} = this.props;
    let {numeralValue} = this.state;
    return (
      <Input type='text' value={numeralValue} bsSize={bsSize} bsStyle={bsStyle}
             addonAfter={addonAfter} buttonAfter={buttonAfter} onChange={() => this._handleInputValueChange(event)}/>
    );
  }
}

NumeralInput.defaultProps = {
  numeralFormat: '0,0',
  value: 0,
  onChange: () => {
  }
};

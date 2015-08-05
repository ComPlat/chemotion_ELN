import React, {Component} from 'react';
import Numeral from 'numeral';
import {Input} from 'react-bootstrap';

export default class NumeralInput extends Component {
  constructor(props) {
    super(props);

    let {defaultValue} = props;
    this.state = {
      value: this._getNumeralValue(defaultValue)
    };
  }

  _getNumeralValue(value) {
    let {numeralFormat} = this.props;
    return Numeral(value).format(numeralFormat);
  }

  //TODO fix issue that cursor is behind, when numeral inserts a comma:
  // containing comas need to be compared to previous amount
  _handleInputValueChange(event) {
    let inputField = event.target;
    let inputValue = inputField.value;
    let caretPosition = $(inputField).caret();
    let numeralValue = this._getNumeralValue(inputValue);

    console.log("carret-pos: " + caretPosition);
    console.log("input-value: " + inputValue);
    console.log("numeral-value:" + numeralValue);

    this.setState({
          value: numeralValue
        }, () => $(inputField).caret(caretPosition)
    );
  }

  render() {
    let {value} = this.state;
    return (
        <Input type='text' value={value} onChange={this._handleInputValueChange.bind(this)} {...this.props} />
    );
  }
}

NumeralInput.defaultProps = {
  numeralFormat: '0,0',
  defaultValue: 0
};

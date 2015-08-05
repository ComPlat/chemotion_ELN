import React, {Component} from 'react';
import Numeral from 'numeral';
import {Input} from 'react-bootstrap';

export default class NumeralInput extends Component {
  constructor(props) {
    super(props);

    let {defaultValue} = props;
    this.state = {
      numeralValue: this._getNumeralValue(defaultValue),
      value: defaultValue
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
    let caretPosition = $(inputField).caret();
    let {value} = inputField;
    let numeralValue = this._getNumeralValue(value);
    let {onChange} = this.props;
    //console.log("carret-pos: " + caretPosition);
    //console.log("input-value: " + value);
    //console.log("numeral-value:" + numeralValue);

    this.setState({
          numeralValue: numeralValue,
          value: value
        }, () => {
          if (onChange) {
            let unformatedValue = Numeral().unformat(value);
            onChange(unformatedValue);
          }
          $(inputField).caret(caretPosition);
        }
    );
  }

  render() {
    let {numeralValue} = this.state;
    //extract onChange from props so it is not passed down
    let {onChange, ...other} = this.props;
    return (
        <Input type='text' value={numeralValue} onChange={this._handleInputValueChange.bind(this)} {...other} />
    );
  }
}

NumeralInput.defaultProps = {
  numeralFormat: '0,0',
  defaultValue: 0
};

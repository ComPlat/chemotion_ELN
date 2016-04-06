import React, {Component} from 'react';
import {DropdownButton, MenuItem,Input,Button} from 'react-bootstrap';
import {metPreConv,metPrefSymbols} from './utils/metricPrefix';

export default class NumeralInputWithUnitsCompo extends Component {
  constructor(props) {
    super(props);
    let {value, unit,metricPrefix,precision} = props;
    this.state ={
      unit: unit,
      value: value,
      metricPrefix: metricPrefix,
      currentPrecision: precision
    };
  }

  componentWillReceiveProps(nextProps) {
    let {value, unit,metricPrefix,precision} = nextProps;
    this.setState({
      unit: unit,
      value: value,
    })
  }

  _handleValueChange(value) {
    this.setState({
      value: value
    }, () => this._onChangeCallback());
  }

  _handleInputValueChange(event) {
    //TODO fix issue that cursor is behind, when a comma is inserted:
    // containing comas need to be compared to previous amount
    let inputField = event.target;
    let caretPosition = $(inputField).caret();
    let {value} = inputField;
    let {metricPrefix} = this.state;
    let unformatedValue = metPreConv(value,metricPrefix,"none") ;
    let {onChange} = this.props;
    console.log(value);    console.log(inputField);
    this.setState({
        value: unformatedValue
      }, () => {
        this._onChangeCallback();
        $(inputField).caret(caretPosition);
      }
    );
    onChange({value: unformatedValue,unit: this.state.unit});
  }
  _handleInputValueFocus(event){
     this.setState({
        currentPrecision: undefined
      }, () => {this._onChangeCallback();}
  );
  }
  _handleInputValueBlur(event){
     this.setState({
        currentPrecision: 3
      }, () => {this._onChangeCallback();}
  );
  }

  _onChangeCallback() {
    if(this.props.onChange) {
      console.log(this.state);
      this.props.onChange(this.state);
    }
  }
  togglePrefix(){
    let {metricPrefixes} = this.props
    let ind = metricPrefixes.indexOf(this.state.metricPrefix)
    if (ind < metricPrefixes.length-1) {
      ind +=1;
    } else { ind=0;}
    this.setState({
      metricPrefix: metricPrefixes[ind]
    });
  }

// TODO fix css-issue with wrong z-index
  render() {
    let {units, bsSize, bsStyle, label, numeralFormat, key} = this.props;
    let {unit, value,metricPrefix,currentPrecision} = this.state;
    let mp = metPrefSymbols[metricPrefix];
    let val = metPreConv(value,"none",metricPrefix);
    console.log('render:'+val);
    let lab =<Button active onClick={() =>{this.togglePrefix()}} bsStyle={bsStyle} bsSize={bsSize}>{mp+unit}</Button>
    return (
      <div >
        <Input  key={key} type='text'  bsSize={bsSize} bsStyle={bsStyle} label={label}
          value={val.toPrecision(currentPrecision)}
          onChange={(event) => this._handleInputValueChange(event)}
          onFocus={(event) => this._handleInputValueFocus(event)}
          onBlur={(event)=>this._handleInputValueBlur(event)}
          buttonAfter={lab}
          />
      </div>
    );
  }
}

NumeralInputWithUnitsCompo.defaultProps = {
  value: 0,
  numeralFormat: '',
  units: []
};

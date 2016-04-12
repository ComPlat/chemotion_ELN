import React, {Component} from 'react';
import {SplitButton, MenuItem,Input,Button} from 'react-bootstrap';
import {metPreConv,metPrefSymbols} from './utils/metricPrefix';

export default class NumeralInputWithUnitsCompo extends Component {
  constructor(props) {
    super(props);
    let {value, unit,metricPrefix,precision} = props;
    this.state ={
      unit: unit,
      value: value,
      metricPrefix: metricPrefix,
      currentPrecision: precision,
      valueString: metPreConv(value,"none",metricPrefix) || 0,
      showString: false
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

    let inputField = event.target;
    let caretPosition = $(inputField).caret();
    let {value} = inputField;
    let {metricPrefix,valueString} = this.state;
    let {onChange} = this.props;
  //  let l = value.length;
    let lastChar =  value[caretPosition-1] || "";
    let md = lastChar.match(/\d/);
    let mc = lastChar.match(/\.|(,)/);
    let comma= parseInt(value)!=value && value.match(/\./)&&value.match(/\./).index;



    if (mc && mc[1]){value = value.slice(0,caretPosition-1)+'.'+value.slice(caretPosition)}
    if (md||mc){
      if(parseFloat(valueString)==value){}
      valueString=value}else{
    }

    this.setState({
        value:  metPreConv(value,metricPrefix,"none"),
        valueString: valueString
      }, () => {
        this._onChangeCallback();
        $(inputField).caret(caretPosition);
      }
    );
  //  onChange({value: unformatedValue,unit: this.state.unit});
  }


  _handleInputValueFocus(event){
     this.setState({
        currentPrecision: undefined,
        showString: true
      }, () => {this._onChangeCallback();}
  );
  }
  _handleInputValueBlur(event){
     this.setState({
        //valueString: value.toPrecision(currentPrecision)
        currentPrecision: this.props.precision,
        showString: false
      }, () => {this._onChangeCallback();}
  );
  }

  _onChangeCallback() {
    if(this.props.onChange) {
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
    let {units, bsSize, bsStyle, label, key} = this.props;
    let {unit,showString, value,metricPrefix,currentPrecision,valueString} = this.state;
    let mp = metPrefSymbols[metricPrefix];
    let val = ()=>{
      if (!showString){
        return  metPreConv(value,"none",metricPrefix).toPrecision(currentPrecision);
      }else{return valueString}
    };
    let prefixSwitch =<Button active onClick={() =>{this.togglePrefix()}} bsStyle={bsStyle} bsSize={bsSize}>{mp+unit}</Button>
    return (
      <div >
        <Input  key={key} type='text'  bsSize={bsSize} bsStyle={bsStyle} label={label}
          value={val()}
          onChange={(event) => this._handleInputValueChange(event)}
          onFocus={(event) => this._handleInputValueFocus(event)}
          onBlur={(event)=>this._handleInputValueBlur(event)}
          buttonAfter={prefixSwitch}
          />
      </div>
    );
  }
}

NumeralInputWithUnitsCompo.defaultProps = {
  value: 0,
  units: []
};

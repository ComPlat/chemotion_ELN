import React, {Component} from 'react';
import {FormGroup,FormControl, ControlLabel, InputGroup,Button} from 'react-bootstrap';
import {metPreConv,metPrefSymbols} from './utils/metricPrefix';

export default class NumeralInputWithUnitsCompo extends Component {
  constructor(props) {
    super(props);
    let {value, unit,metricPrefix,precision} = props;
    this.state ={
      unit: unit,
      value: value,
      metricPrefix: metricPrefix || "none",
      currentPrecision: precision,
      valueString:  0,
      showString: false
    };
  }

  componentWillReceiveProps(nextProps) {
    let {value, unit} = nextProps;
    this.setState({
      unit: unit,
      value: value,
    });
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
    let lastChar =  value[caretPosition-1] || "";
    let md = lastChar.match(/\d/);
    let mc = lastChar.match(/\.|(,)/);

    if (mc && mc[1]){value = value.slice(0,caretPosition-1)+'.'+value.slice(caretPosition)}

    if (md||mc){valueString=value}

    this.setState({
        value:  metPreConv(value,metricPrefix,"none"),
        valueString: valueString
      }, () => {
        this._onChangeCallback();
        $(inputField).caret(caretPosition);
      }
    );

  }

  _handleInputValueFocus(event){
    this.setState({
      currentPrecision: undefined,
      showString: true,
      valueString: metPreConv(this.state.value,"none",this.state.metricPrefix) || 0,
      }, () => {this._onChangeCallback();}
    );
  }

  _handleInputValueBlur(event){
     this.setState({
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
    let {units, bsSize, bsStyle, disabled,label, key} = this.props;
    let {unit,showString, value,metricPrefix,currentPrecision,valueString} = this.state;
    let mp = metPrefSymbols[metricPrefix];
    let val = ()=>{
      if (!showString){
        return  metPreConv(value,"none",metricPrefix).toPrecision(currentPrecision);
      }else{return valueString}
    };

    let prefixSwitch;
    // BsStyle-s for Input and buttonAfter have differences
    let bsStyleBtnAfter = bsStyle == 'error' ? 'danger' : bsStyle;
    if(unit != 'none')
       prefixSwitch=<InputGroup.Button><Button active style={ {padding: '6px'}} onClick={() =>{this.togglePrefix()}} bsStyle={bsStyleBtnAfter} bsSize={bsSize}>{mp+unit}</Button></InputGroup.Button>

    return (
      <div >
        <FormGroup>
          <ControlLabel>{label}</ControlLabel>
          <InputGroup>
            <FormControl type='text'
              key={key} disabled={disabled} bsSize={bsSize} bsStyle={bsStyle}
              value={val()}
              onChange={(event) => this._handleInputValueChange(event)}
              onFocus={(event) => this._handleInputValueFocus(event)}
              onBlur={(event)=>this._handleInputValueBlur(event)}
            />
            {prefixSwitch}
          </InputGroup>
        </FormGroup>
      </div>
    );
  }
}

NumeralInputWithUnitsCompo.defaultProps = {
  value: 0,
  units: []
};

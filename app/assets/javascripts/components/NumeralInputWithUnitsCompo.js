import React, {Component} from 'react';
import {FormControl, ControlLabel, InputGroup,Button} from 'react-bootstrap';
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
    let lastChar =  value[caretPosition-1] || "";

    if(lastChar != "" && !lastChar.match(/-|\d|\.|(,)/)) return false;

    let md = lastChar.match(/-|\d/);
    let mc = lastChar.match(/\.|(,)/);

    if (mc && mc[1]){value = value.slice(0,caretPosition-1)+'.'+value.slice(caretPosition)}
    else if (value == '0.' || value == '00'){
      value = '0.0';
    }

    value = value.replace('--', '');
    let matchMinus = value.match(/\d+(\-+)\d*/);
    if(matchMinus && matchMinus[1])
    value = value.replace(matchMinus[1], '');

    if (md||mc){ valueString=value }

    let val = metPreConv(value, metricPrefix, "none");
    this.setState({
        value:  val,
        showString: true,
        valueString: valueString
      }, () => {
        this._onChangeCallback();
        $(inputField).caret(caretPosition);
      }
    );

  }

  _handleInputValueFocus(){
    this.setState({
      currentPrecision: undefined,
      showString: true,
      valueString: metPreConv(this.state.value,"none",this.state.metricPrefix) || 0,
      }, () => {this._onChangeCallback();}
    );
  }

  _handleInputValueBlur(){
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

  render() {
    let { bsSize, bsStyle, disabled,label} = this.props;
    let {unit,showString, value,metricPrefix,currentPrecision,valueString} = this.state;
    let mp = metPrefSymbols[metricPrefix];
    let val = ()=>{
      const nanOrInfinity = isNaN(value) || !isFinite(value)
      if (!showString && nanOrInfinity){
        return 'n.d.'
      } else if (!showString) {
        return  metPreConv(value,"none",metricPrefix).toPrecision(currentPrecision);
      } else {return valueString}
    };

    let prefixSwitch;
    // BsStyle-s for Input and buttonAfter have differences
    let bsStyleBtnAfter = bsStyle == 'error' ? 'danger' : bsStyle;
    let labelWrap = label ? <ControlLabel>{label}</ControlLabel> : null
    if(unit != 'none') {
      prefixSwitch = (
        <InputGroup.Button>
          <Button active
            onClick={() =>{this.togglePrefix()}}
            bsClass='bs-btnTxt--small btn'
            bsStyle={bsStyleBtnAfter}
            bsSize={bsSize}
            style={{padding:"6px 2px 6px 2px"}}
          >
            {mp + unit}
          </Button>
        </InputGroup.Button>
      )

      return (
        <div>
          {labelWrap}
          <InputGroup>
            <FormControl type='text'
              bsClass='bs-form--compact form-control'
              disabled={disabled} bsSize={bsSize} bsStyle={bsStyle}
              value={val() || ''}
              onChange={(event) => this._handleInputValueChange(event)}
              onFocus={(event) => this._handleInputValueFocus(event)}
              onBlur={(event)=>this._handleInputValueBlur(event)}
            />
            {prefixSwitch}
          </InputGroup>
        </div>
      );
    } else {
      return(
        <div>
          {labelWrap}
          <FormControl type='text'
            bsClass='bs-form--compact form-control'
            disabled={disabled} bsSize={bsSize} bsStyle={bsStyle}
            value={val() || ''}
            onChange={(event) => this._handleInputValueChange(event)}
            onFocus={(event) => this._handleInputValueFocus(event)}
            onBlur={(event)=>this._handleInputValueBlur(event)}
          />
        </div>
      );
    }
  }
}

NumeralInputWithUnitsCompo.propTypes = {
  onChange: React.PropTypes.func,
  unit: React.PropTypes.string,
  units: React.PropTypes.array,
  metricPrefix: React.PropTypes.string,
  metricPrefixes: React.PropTypes.array,
  precision: React.PropTypes.number,
  disabled: React.PropTypes.bool,
  label: React.PropTypes.node,
  bsSize: React.PropTypes.string,
  bsStyle: React.PropTypes.string,
};

NumeralInputWithUnitsCompo.defaultProps = {
  unit: 'none',
  value: 0,
  units: [],
  disabled: false,
  bsSize: "small",
  bsStyle: "default"
};

import React, { Component } from 'react';
import { FormControl, ControlLabel, InputGroup, Button } from 'react-bootstrap';
import { metPreConv, metPrefSymbols } from './utils/metricPrefix';

export default class NumeralInputWithUnitsCompo extends Component {
  constructor(props) {
    super(props);

    const { value, block, metricPrefix, precision } = props;
    this.state = {
      value,
      block,
      metricPrefix: metricPrefix || 'none',
      currentPrecision: precision,
      valueString: 0,
      showString: false,
    };
  }

  componentDidMount() {
    this.forceUpdate();
  }

  componentWillReceiveProps(nextProps) {
    const { value, block } = nextProps;
    this.setState({ value, block });
  }

  shouldComponentUpdate(nextProps, nextState) {
    const hasChanged = nextProps.value !== this.props.value
      || nextProps.block !== this.props.block
      || nextProps.metricPrefix !== this.props.metricPrefix
      || nextProps.bsStyle !== this.props.bsStyle
      || nextProps.disabled !== this.props.disabled
      || nextState.value !== this.state.value
      || nextState.block !== this.state.block
      || nextState.metricPrefix !== this.state.metricPrefix
      || nextState.currentPrecision !== this.state.currentPrecision
      || nextState.valueString !== this.state.valueString
      || nextState.showString !== this.state.showString
      || nextProps.label !== this.props.label
      || nextProps.unit !== this.props.unit;
    return hasChanged;
  }

  _handleValueChange(value) {
    this.setState({ value }, () => this._onChangeCallback());
  }

  _handleInputValueChange(event) {
    const inputField = event.target;
    inputField.focus();
    const { value, selectionStart } = inputField;
    let { valueString } = this.state;
    let newValue = value;
    const { metricPrefix } = this.state;
    const lastChar = value[selectionStart - 1] || '';

    if (lastChar !== '' && !lastChar.match(/-|\d|\.|(,)/)) return false;
    // if (value[0] !== '0') { newValue = '0'.concat(newValue); }

    const md = lastChar.match(/-|\d/);
    const mc = lastChar.match(/\.|(,)/);

    if (mc && mc[1]) {
      newValue = `${value.slice(0, selectionStart - 1)}.${value.slice(selectionStart)}`;
    // } else if (value === '00') { // else if (value === '0.' || value === '00') {
    //   newValue = '0.0';
    }

    newValue = newValue.replace('--', '');
    newValue = newValue.replace('..', '.');
    const matchMinus = newValue.match(/\d+(-+)\d*/);
    if (matchMinus && matchMinus[1]) newValue = newValue.replace(matchMinus[1], '');

    if (md || mc) { valueString = newValue; }

    this.setState(
      {
        value: metPreConv(newValue, metricPrefix, 'none'),
        showString: true,
        valueString,
      },
      () => { this._onChangeCallback(); inputField.selectionStart = selectionStart; }
    );
    return null;
  }

  _handleInputValueFocus() {
    const { value, metricPrefix } = this.state;
    this.setState({
      currentPrecision: undefined,
      showString: true,
      valueString: metPreConv(value, 'none', metricPrefix) || 0,
    });
  }

  _handleInputValueBlur() {
    this.setState({
      currentPrecision: this.props.precision,
      showString: false,
    }, () => this._onChangeCallback());
  }

  handleInputDoubleClick() {
    if (this.state.block) {
      this.setState({
        block: false,
        value: 0,
      });
    }
  }

  _onChangeCallback() {
    if (this.props.onChange) {
      this.props.onChange({ ...this.state, unit: this.props.unit });
    }
  }

  togglePrefix() {
    const { metricPrefixes } = this.props;
    let ind = metricPrefixes.indexOf(this.state.metricPrefix);
    if (ind < metricPrefixes.length - 1) {
      ind += 1;
    } else {
      ind = 0;
    }
    this.setState({
      metricPrefix: metricPrefixes[ind]
    });
  }

  render() {
    const { bsSize, bsStyle, disabled, label, unit } = this.props;
    const {
      showString, value, metricPrefix,
      currentPrecision, valueString, block,
    } = this.state;
    const mp = metPrefSymbols[metricPrefix];
    const nanOrInfinity = isNaN(value) || !isFinite(value);
    const val = () => {
      if (!showString && nanOrInfinity) {
        return 'n.d.';
      } else if (!showString) {
        return metPreConv(value, 'none', metricPrefix).toPrecision(currentPrecision);
      }
      return valueString;
    };
    const inputDisabled = disabled ? true : block;
    // BsStyle-s for Input and buttonAfter have differences
    const bsStyleBtnAfter = bsStyle === 'error' ? 'danger' : bsStyle;
    const labelWrap = label ? <ControlLabel>{label}</ControlLabel> : null;
    if (unit !== 'none') {
      const prefixSwitch = (
        <InputGroup.Button>
          <Button
            active
            onClick={() => { this.togglePrefix(); }}
            bsStyle={bsStyleBtnAfter}
            bsSize={bsSize}
          >
            {mp + unit}
          </Button>
        </InputGroup.Button>
      );

      return (
        <div className="numeric-input-unit">
          {labelWrap}
          <InputGroup
            onDoubleClick={event => this.handleInputDoubleClick(event)}
          >
            <FormControl
              type="text"
              bsClass="bs-form--compact form-control"
              disabled={inputDisabled}
              bsSize={bsSize}
              bsStyle={bsStyle}
              value={val() || ''}
              onChange={event => this._handleInputValueChange(event)}
              onFocus={event => this._handleInputValueFocus(event)}
              onBlur={event => this._handleInputValueBlur(event)}
            />
            {prefixSwitch}
          </InputGroup>
        </div>
      );
    }
    return (
      <div className="numeric-input-unit">
        {labelWrap}
        <div onDoubleClick={event => this.handleInputDoubleClick(event)}>
          <FormControl
            type="text"
            bsClass="bs-form--compact form-control"
            disabled={inputDisabled}
            bsSize={bsSize}
            bsStyle={bsStyle}
            value={val() || ''}
            onChange={event => this._handleInputValueChange(event)}
            onFocus={event => this._handleInputValueFocus(event)}
            onBlur={event => this._handleInputValueBlur(event)}
            onDoubleClick={event => this.handleInputDoubleClick(event)}
          />
        </div>
      </div>
    );
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
  block: false,
  bsSize: 'small',
  bsStyle: 'default',
};

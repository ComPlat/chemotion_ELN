import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';
import { Form, InputGroup, Button } from 'react-bootstrap';
import { metPreConv, metPrefSymbols } from 'src/utilities/metricPrefix';

export default class NumeralInputWithUnitsCompo extends Component {
  constructor(props) {
    super(props);

    const { value, block, metricPrefix, precision } = props;
    this.state = {
      value,
      block,
      metricPrefix: metricPrefix || 'n',
      currentPrecision: precision,
      valueString: 0,
      showString: false,
    };
  }

  componentDidMount() {
    this.forceUpdate();
  }

  componentDidUpdate(prevProps) {
    const { value, block } = this.props;
    // isEqual considers NaN to be equal to NaN
    if (!isEqual(value, prevProps.value) || block !== prevProps.block) {
      this.setState({ value, block });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const hasChanged = nextProps.value !== this.props.value
      || nextProps.block !== this.props.block
      || nextProps.metricPrefix !== this.props.metricPrefix
      || nextProps.variant !== this.props.variant
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
        value: metPreConv(newValue, metricPrefix, 'n'),
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
      valueString: metPreConv(value, 'n', metricPrefix) || 0,
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

  togglePrefix(currentUnit) {
    const units = ['TON/h', 'TON/m', 'TON/s', '°C', '°F', 'K', 'h', 'm', 's'];
    const excludedUnits = ['ppm', 'TON', '%'];
    const { onMetricsChange, unit } = this.props;
    if (units.includes(currentUnit)) {
      // eslint-disable-next-line no-unused-expressions
      onMetricsChange && onMetricsChange(
        { ...this.state, metricUnit: unit }
      );
    } else if (excludedUnits.includes(currentUnit)) {
      return null;
    } else {
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

      onMetricsChange && onMetricsChange({ ...this.state, metricUnit: unit, metricPrefix: metricPrefixes[ind] });
    }
  }

  render() {
    const {
      size, variant, disabled, label, unit, name
    } = this.props;
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
        return metPreConv(value, 'n', metricPrefix).toPrecision(currentPrecision);
      }
      return valueString;
    };
    const inputDisabled = disabled ? true : block;
    const alwaysAllowDisplayUnit = ['TON', 'TON/h', 'TON/m', 'TON/s', 'g', 'mg', 'μg', 'mol', 'mmol', 'l', 'ml', 'μl'];
    const unitDisplayMode = alwaysAllowDisplayUnit.includes(unit) ? false : inputDisabled;
    // BsStyle-s for Input and buttonAfter have differences
    const variantBtnAfter = variant === 'error' ? 'danger' : variant;
    if (unit !== 'n') {
      const prefixSwitch = (
        <Button
          disabled={unitDisplayMode}
          onClick={() => { this.togglePrefix(unit); }}
          variant={variantBtnAfter}
          size={size}
          className="px-2"
        >
          {mp + unit}
        </Button>
      );

      return (
        <div>
          {label && <Form.Label className="me-2">{label}</Form.Label>}
          <InputGroup
            className="d-flex flex-nowrap align-items-center w-100"
            onDoubleClick={event => this.handleInputDoubleClick(event)}
          >
            <Form.Control
              type="text"
              disabled={inputDisabled}
              variant={variant}
              size={size}
              value={val() || ''}
              onChange={event => this._handleInputValueChange(event)}
              onFocus={event => this._handleInputValueFocus(event)}
              onBlur={event => this._handleInputValueBlur(event)}
              name={name}
              className="flex-grow-1"
            />
            {prefixSwitch}
          </InputGroup>
        </div>
      );
    }
    return (
      <div>
        {label && <Form.Label className="me-2">{label}</Form.Label>}
        <div onDoubleClick={event => this.handleInputDoubleClick(event)}>
          <Form.Control
            type="text"
            disabled={inputDisabled}
            variant={variant}
            size={size}
            value={val() || ''}
            onChange={event => this._handleInputValueChange(event)}
            onFocus={event => this._handleInputValueFocus(event)}
            onBlur={event => this._handleInputValueBlur(event)}
            onDoubleClick={event => this.handleInputDoubleClick(event)}
            name={name}
            className="flex-grow-1"
          />
        </div>
      </div>
    );
  }
}

NumeralInputWithUnitsCompo.propTypes = {
  onChange: PropTypes.func,
  onMetricsChange: PropTypes.func,
  unit: PropTypes.string,
  units: PropTypes.array,
  metricPrefix: PropTypes.string,
  metricPrefixes: PropTypes.array,
  precision: PropTypes.number,
  disabled: PropTypes.bool,
  label: PropTypes.node,
  variant: PropTypes.string,
  size: PropTypes.string,
  name: PropTypes.string
};

NumeralInputWithUnitsCompo.defaultProps = {
  unit: 'n',
  value: 0,
  units: [],
  disabled: false,
  block: false,
  variant: 'light',
  name: ''
};

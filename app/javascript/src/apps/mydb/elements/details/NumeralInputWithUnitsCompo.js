import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';
import {
  Form, InputGroup, Button, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import { metPreConv, metPrefSymbols } from 'src/utilities/metricPrefix';
import { formatDisplayValue } from 'src/utilities/MathUtils';

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
      copyButtonText: '📋',
    };
    this.handleCopyClick = this.handleCopyClick.bind(this);
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

  /**
   * Handles copying the value to clipboard and shows temporary feedback
   */
  handleCopyClick = async (value) => {
    if (value && value !== 'n.d.') {
      try {
        await navigator.clipboard.writeText(value.toString());
        this.setState({ copyButtonText: '✓' }, () => {
          this.forceUpdate(); // Force re-render to ensure UI updates
          setTimeout(() => {
            this.setState({ copyButtonText: '📋' }, () => {
              this.forceUpdate(); // Force re-render to ensure UI updates
            });
          }, 2000);
        });
      } catch (err) {
        this.setState({ copyButtonText: '❌' }, () => {
          this.forceUpdate(); // Force re-render to ensure UI updates
          setTimeout(() => {
            this.setState({ copyButtonText: '📋' }, () => {
              this.forceUpdate(); // Force re-render to ensure UI updates
            });
          }, 2000);
        });
      }
    }
  };

  render() {
    const {
      size, variant, disabled, label, unit, name, showInfoTooltipTotalVol, showInfoTooltipRequiredVol
    } = this.props;
    const {
      showString, value, metricPrefix,
      currentPrecision, valueString, block,
      copyButtonText
    } = this.state;
    const mp = metPrefSymbols[metricPrefix];
    const nanOrInfinity = Number.isNaN(value) || !Number.isFinite(value);

    // Calculate display value once during render
    let displayValue;
    if (!showString && nanOrInfinity) {
      displayValue = 'n.d.';
    } else if (!showString) {
      displayValue = formatDisplayValue(metPreConv(value, 'n', metricPrefix), currentPrecision);
    } else {
      displayValue = valueString;
    }

    const inputDisabled = disabled ? true : block;
    const alwaysAllowDisplayUnit = [
      'TON', 'TON/h', 'TON/m', 'TON/s',
      'g', 'mg', 'μg', 'mol', 'mmol',
      'l', 'ml', 'μl', 'mol/l', 'g/ml'
    ];
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
          {showInfoTooltipTotalVol && (
            <OverlayTrigger
              placement="top"
              delay={{ show: 500, hide: 1000 }} // in milliseconds
              overlay={(
                <Tooltip id="info-total-volume">
                  <div>
                    <p className="mb-2">
                      It is only a value given manually, i.e. volume by definition — not (re)calculated.
                    </p>
                    <p className="mb-2">
                      Recalculation occurs only when the attributes of a component with a locked total concentration are
                      modified.
                    </p>
                    <a
                      href="https://www.chemotion.net/docs/eln/ui/elements/samples/mixtures#-total-volume-and-solvent-addition"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Learn more
                    </a>
                  </div>
                </Tooltip>
              )}
            >
              <i className="ms-1 fa fa-info-circle" />
            </OverlayTrigger>
          )}
          {showInfoTooltipRequiredVol && (
            <OverlayTrigger
              placement="top"
              overlay={(
                <Tooltip id="info-required-volume">
                  <p className="mb-2">
                    Calculation of the volume required to get the desired concentration of a selected component in the
                    mixture.
                  </p>
                  <p>
                    Please use the reference (Ref) button to select the component. The calculation is a helper for
                    planning the reaction's components, it does not have impact on the component table.
                  </p>
                </Tooltip>
              )}
            >
              <i className="ms-1 fa fa-info-circle" />
            </OverlayTrigger>
          )}
          <InputGroup
            className="d-flex flex-nowrap align-items-center w-100"
          >
            <Form.Control
              type="text"
              disabled={inputDisabled}
              variant={variant}
              size={size}
              value={displayValue || ''}
              onChange={event => this._handleInputValueChange(event)}
              onFocus={event => this._handleInputValueFocus(event)}
              onBlur={event => this._handleInputValueBlur(event)}
              name={name}
              className="flex-grow-1"
            />
            {prefixSwitch}
            {showInfoTooltipRequiredVol && (
              <Button
                variant="outline-secondary"
                size={size}
                onClick={() => this.handleCopyClick(displayValue)}
                className="ms-1"
                title={copyButtonText === '📋' ? 'Copy to clipboard' : copyButtonText === '✓' ? 'Copied!' : 'Failed to copy'}
                style={{ minWidth: '32px' }}
              >
                {copyButtonText}
              </Button>
            )}
          </InputGroup>
        </div>
      );
    }
    return (
      <div>
        {label && <Form.Label className="me-2">{label}</Form.Label>}
        <div>
          <Form.Control
            type="text"
            disabled={inputDisabled}
            variant={variant}
            size={size}
            value={displayValue || ''}
            onChange={event => this._handleInputValueChange(event)}
            onFocus={event => this._handleInputValueFocus(event)}
            onBlur={event => this._handleInputValueBlur(event)}
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
  name: PropTypes.string,
  showInfoTooltipTotalVol: PropTypes.bool,
  showInfoTooltipRequiredVol: PropTypes.bool,
};

NumeralInputWithUnitsCompo.defaultProps = {
  unit: 'n',
  value: 0,
  units: [],
  disabled: false,
  block: false,
  variant: 'light',
  name: '',
  showInfoTooltipTotalVol: false,
  showInfoTooltipRequiredVol: false,
};

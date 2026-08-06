import React, {
  useState, useEffect, useRef, useLayoutEffect, useCallback,
} from 'react';
import PropTypes from 'prop-types';
import {
  Form, InputGroup, Button, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import { metPreConv, metPrefSymbols } from 'src/utilities/metricPrefix';
import { formatDisplayValue } from 'src/utilities/MathUtils';
import { copyToClipboard } from 'src/utilities/clipboard';

const NumeralInputWithUnitsCompo = ({
  isRangeField = false, rangeEnd = null, rangeStart = null,
  value: valueProp, block: blockProp, metricPrefix: metricPrefixProp, precision,
  size, disabled, label, unit, name,
  showInfoTooltipTotalVol, showInfoTooltipRequiredVol,
  className, overlayMessage, active, isError, disableUnitButtonPadding,
  onChange, onMetricsChange, metricPrefixes,
}) => {
  const [state, setState] = useState(() => ({
    value: valueProp,
    block: blockProp,
    metricPrefix: metricPrefixProp || 'n',
    currentPrecision: precision,
    valueString: 0,
    showString: false,
  }));

  // Restores the caret position after a controlled value update (previously done in
  // the setState callback of _handleInputValueChange).
  const pendingSelection = useRef(null);
  useLayoutEffect(() => {
    if (pendingSelection.current) {
      const { node, selectionStart } = pendingSelection.current;
      node.selectionStart = selectionStart;
      pendingSelection.current = null;
    }
  });

  // Keep local value/block in sync with incoming props (previously componentDidUpdate).
  // Object.is treats NaN as equal to NaN, matching the previous isEqual guard. Deliberate
  // setState-in-effect: the input buffers the value locally while typing and re-adopts the prop
  // when the model changes under it, exactly as the class version did.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, value: valueProp, block: blockProp }));
  }, [valueProp, blockProp]);

  const onChangeCallback = useCallback((nextState) => {
    if (onChange) {
      onChange({ ...nextState, unit });
    }
  }, [onChange, unit]);

  const handleInputValueChange = (event) => {
    const inputField = event.target;
    inputField.focus();
    const { value, selectionStart } = inputField;
    let { valueString } = state;
    let newValue = value;
    const { metricPrefix } = state;
    const lastChar = value[selectionStart - 1] || '';

    if (lastChar !== '' && !lastChar.match(/-|\d|\.|(,)/)) return false;

    const md = lastChar.match(/-|\d/);
    const mc = lastChar.match(/\.|(,)/);

    if (mc && mc[1]) {
      newValue = `${value.slice(0, selectionStart - 1)}.${value.slice(selectionStart)}`;
    }

    newValue = newValue.replace('--', '');
    newValue = newValue.replace('..', '.');
    const matchMinus = newValue.match(/\d+(-+)\d*/);
    if (matchMinus && matchMinus[1]) newValue = newValue.replace(matchMinus[1], '');

    if (md || mc) { valueString = newValue; }

    const nextState = {
      ...state,
      value: metPreConv(newValue, metricPrefix, 'n'),
      showString: true,
      valueString,
    };
    pendingSelection.current = { node: inputField, selectionStart };
    setState(nextState);
    onChangeCallback(nextState);
    return null;
  };

  const handleInputValueFocus = () => {
    setState((s) => ({
      ...s,
      currentPrecision: undefined,
      showString: true,
      valueString: metPreConv(s.value, 'n', s.metricPrefix) || 0,
    }));
  };

  const handleInputValueBlur = () => {
    const nextState = {
      ...state,
      value: valueProp,
      currentPrecision: precision,
      showString: false,
      valueString: metPreConv(valueProp, 'n', state.metricPrefix) || 0,
    };
    setState(nextState);
    onChangeCallback(nextState);
  };

  const togglePrefix = (currentUnit) => {
    const units = ['TON/h', 'TON/m', 'TON/s', '°C', '°F', 'K', 'h', 'm', 's'];
    const excludedUnits = ['ppm', 'TON', '%'];
    if (units.includes(currentUnit)) {
      // eslint-disable-next-line no-unused-expressions
      onMetricsChange && onMetricsChange(
        { ...state, metricUnit: unit }
      );
    } else if (excludedUnits.includes(currentUnit)) {
      return null;
    } else {
      let ind = metricPrefixes.indexOf(state.metricPrefix);
      if (ind < metricPrefixes.length - 1) {
        ind += 1;
      } else {
        ind = 0;
      }
      setState((s) => ({ ...s, metricPrefix: metricPrefixes[ind] }));

      // eslint-disable-next-line no-unused-expressions
      onMetricsChange && onMetricsChange({ ...state, metricUnit: unit, metricPrefix: metricPrefixes[ind] });
    }
    return null;
  };

  const {
    showString, value, metricPrefix, currentPrecision, valueString, block
  } = state;
  const mp = metPrefSymbols[metricPrefix];

  // Calculate display value once during render
  const [
    displayValue,
    displayRangeStart,
    displayRangeEnd
  ] = [value, rangeStart, rangeEnd].map((v) => {
    const nanOrInfinity = Number.isNaN(v) || !Number.isFinite(v);
    if (!showString && nanOrInfinity) {
      return 'n.d.';
    } else if (!showString) {
      return formatDisplayValue(metPreConv(v, 'n', metricPrefix), currentPrecision);
    }
    return valueString;
  });

  const inputDisabled = disabled ? true : block;
  const alwaysAllowDisplayUnit = [
    'TON', 'TON/h', 'TON/m', 'TON/s',
    'g', 'mg', 'μg', 'mol', 'mmol',
    'l', 'ml', 'μl', 'mol/l', 'g/ml'
  ];
  const unitDisplayMode = alwaysAllowDisplayUnit.includes(unit) ? false : inputDisabled;
  const isActiveUnit = Boolean(active) && !isRangeField;
  const hasErrorState = Boolean(isError);

  if (unit !== 'n') {
    const prefixSwitch = (
      <Button
        disabled={unitDisplayMode}
        onClick={() => { togglePrefix(unit); }}
        variant={hasErrorState ? 'danger' : 'light'}
        active={isActiveUnit}
        size={size}
        className={disableUnitButtonPadding ? '' : 'px-1'}
      >
        {mp + unit}
      </Button>
    );

    return (
      <div className={[className, 'numeral-input-with-units'].join(' ')}>
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
                    // eslint-disable-next-line max-len
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
                  It gives the expected total volume without considering eventually given additional solvent volumes
                  coming from the solvents&apos; table or the stock solution.
                </p>
                <p>
                  The required total volume is therefore not the volume to be added but the volume to be reached
                  referring to the reference compound.
                </p>
              </Tooltip>
            )}
          >
            <i className="ms-1 fa fa-info-circle" />
          </OverlayTrigger>
        )}
        {(() => {
          const inputGroup = (
            <InputGroup className="w-100">
              { !isRangeField ?
              <Form.Control
                type="text"
                disabled={inputDisabled}
                variant={hasErrorState ? 'danger' : undefined}
                size={size}
                value={displayValue || ''}
                onChange={(event) => handleInputValueChange(event)}
                onFocus={(event) => handleInputValueFocus(event)}
                onBlur={(event) => handleInputValueBlur(event)}
                name={name}
                className="flex-grow-1"
              /> :
              <Form.Control
                type="text"
                disabled={true}
                size={size}
                value={ `${displayRangeStart}-${displayRangeEnd}` }
                name={name}
                className="flex-grow-1"
              /> }
              {prefixSwitch}
              {showInfoTooltipRequiredVol && (
                <OverlayTrigger placement="bottom" overlay={<Tooltip id="assign_button">copy to clipboard</Tooltip>}>
                  <Button
                    variant="light"
                    size={size}
                    onClick={() => copyToClipboard(displayValue)}
                    className="ms-1"
                  >
                    <i className="fa fa-clipboard" />
                  </Button>
                </OverlayTrigger>
              )}
            </InputGroup>
          );

          return overlayMessage ? (
            <OverlayTrigger
              placement="top"
              overlay={(
                <Tooltip id="info-for-weight-percentage-sample">
                  {overlayMessage}
                </Tooltip>
              )}
            >
              {inputGroup}
            </OverlayTrigger>
          ) : inputGroup;
        })()}
      </div>
    );
  }
  return (
    <div className={className}>
      {label && <Form.Label className="me-2" column="sm">{label}</Form.Label>}
      <div>
        <Form.Control
          type="text"
          disabled={inputDisabled}
          variant={hasErrorState ? 'danger' : undefined}
          size={size}
          value={displayValue || ''}
          onChange={(event) => handleInputValueChange(event)}
          onFocus={(event) => handleInputValueFocus(event)}
          onBlur={(event) => handleInputValueBlur(event)}
          name={name}
          className="flex-grow-1"
        />
      </div>
    </div>
  );
};

// Preserves the previous shouldComponentUpdate optimization: re-render only when one of
// these props changes (internal state changes always re-render on their own).
function areEqual(prevProps, nextProps) {
  return prevProps.value === nextProps.value
    && prevProps.block === nextProps.block
    && prevProps.metricPrefix === nextProps.metricPrefix
    && prevProps.active === nextProps.active
    && prevProps.isError === nextProps.isError
    && prevProps.disabled === nextProps.disabled
    && prevProps.label === nextProps.label
    && prevProps.isRangeField === nextProps.isRangeField
    && prevProps.rangeStart === nextProps.rangeStart
    && prevProps.rangeEnd === nextProps.rangeEnd
    && prevProps.unit === nextProps.unit;
}

NumeralInputWithUnitsCompo.propTypes = {
  isRangeField: PropTypes.bool,
  rangeEnd: PropTypes.number,
  rangeStart: PropTypes.number,
  className: PropTypes.string,
  // Numbers usually, but the gas phase fields hand in 'n.d' for a value that is not determined.
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  block: PropTypes.bool,
  onChange: PropTypes.func,
  onMetricsChange: PropTypes.func,
  unit: PropTypes.string,
  units: PropTypes.array,
  metricPrefix: PropTypes.string,
  metricPrefixes: PropTypes.array,
  precision: PropTypes.number,
  disabled: PropTypes.bool,
  label: PropTypes.node,
  size: PropTypes.string,
  name: PropTypes.string,
  showInfoTooltipTotalVol: PropTypes.bool,
  showInfoTooltipRequiredVol: PropTypes.bool,
  overlayMessage: PropTypes.string,
  active: PropTypes.bool,
  isError: PropTypes.bool,
  disableUnitButtonPadding: PropTypes.bool,
};

NumeralInputWithUnitsCompo.defaultProps = {
  isRangeField: false,
  rangeStart: null,
  rangeEnd: null,
  className: '',
  unit: 'n',
  value: 0,
  units: [],
  disabled: false,
  block: false,
  name: '',
  showInfoTooltipTotalVol: false,
  showInfoTooltipRequiredVol: false,
  overlayMessage: null,
  active: false,
  isError: false,
  disableUnitButtonPadding: false,
};

const MemoizedNumeralInputWithUnitsCompo = React.memo(NumeralInputWithUnitsCompo, areEqual);
// Without this the wrapper is reported as "Memo(NumeralInputWithUnitsCompo)" - by React DevTools,
// and by anything that looks the component up by name, tests included.
MemoizedNumeralInputWithUnitsCompo.displayName = 'NumeralInputWithUnitsCompo';

export default MemoizedNumeralInputWithUnitsCompo;


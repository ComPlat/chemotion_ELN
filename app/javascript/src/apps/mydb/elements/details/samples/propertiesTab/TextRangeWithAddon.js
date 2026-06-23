import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { InputGroup, Form } from 'react-bootstrap';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const ALLOWED_INPUT_CHARS = /[-+0-9.,\s><=≥≤–]/;
const NUMBER_REGEX = /-?(?:\d+(?:\.\d+)?|\.\d+)/g;
const COMPARISON_PREFIX_REGEX = /^\s*(>=|<=|≥|≤|>|<)\s*(-?(?:\d+(?:\.\d+)?|\.\d+))\s*$/;

const humanizeFieldName = (field) => field
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (m) => m.toUpperCase());

// Parse the user input into structured bounds + a canonical label.
// Returns null if the input cannot be parsed as a valid range.
export const parseRangeInput = (rawInput) => {
  const trimmed = (rawInput || '').trim();

  if (trimmed === '') {
    return {
      lower: '', upper: '', label: '', kind: 'empty',
    };
  }

  const comparisonMatch = trimmed.match(COMPARISON_PREFIX_REGEX);
  if (comparisonMatch) {
    const operator = comparisonMatch[1];
    const number = Number.parseFloat(comparisonMatch[2]);
    if (Number.isNaN(number)) return null;

    if (operator === '>' || operator === '>=' || operator === '≥') {
      return {
        lower: number,
        upper: Number.POSITIVE_INFINITY,
        label: `${operator}${number}`,
        kind: 'open-upper',
      };
    }
    return {
      lower: Number.NEGATIVE_INFINITY,
      upper: number,
      label: `${operator}${number}`,
      kind: 'open-lower',
    };
  }

  // Normalize common range separators to spaces so the parser can extract numbers.
  // A dash is only treated as a separator when it is *directly* preceded by a digit
  // (e.g. "65-68", "1.5-2.5"); a dash preceded by whitespace or beginning a number
  // ("-65", "65 -68") is left intact as a negative sign.  The Unicode en-dash
  // (used in our display format "65 – 68") is always treated as a separator.
  const normalized = trimmed
    .replace(/(\d)-(?=\s*-?\d)/g, '$1 ')
    .replace(/\s*–\s*/g, ' ')
    .replace(/\.{2,3}/g, ' ')
    .replace(/,/g, '.');

  const numberMatches = normalized.match(NUMBER_REGEX);
  if (!numberMatches || numberMatches.length === 0) return null;

  const numbers = numberMatches
    .map((s) => Number.parseFloat(s))
    .filter((n) => !Number.isNaN(n));

  if (numbers.length === 0) return null;

  if (numbers.length === 1) {
    const value = numbers[0];
    return {
      lower: value, upper: value, label: `${value}`, kind: 'single',
    };
  }

  const lower = numbers[0];
  const upper = numbers[numbers.length - 1];
  if (upper < lower) return null;

  return {
    lower,
    upper,
    label: `${lower} – ${upper}`,
    kind: 'range',
  };
};

export default class TextRangeWithAddon extends Component {
  handleInputChange(e) {
    const { onChange, field } = this.props;
    const input = e.target;
    input.focus();
    const { value, selectionStart } = input;
    const lastChar = value[selectionStart - 1] || '';
    if (lastChar !== '' && !lastChar.match(ALLOWED_INPUT_CHARS)) {
      const reg = new RegExp(lastChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      this.input.value = value.replace(reg, '');
      return;
    }
    // Don't pass a label argument here so we don't pollute xref on every keystroke;
    // the canonical label is committed on blur.
    onChange(field, value, value);
  }

  handleInputFocus() {
    this.input.value = this.input.value.trim().replace(/ – /g, ' ');
  }

  handleInputBlur() {
    const { onChange, field } = this.props;
    const rawValue = this.input.value;
    const parsed = parseRangeInput(rawValue);

    if (parsed === null) {
      const fieldLabel = humanizeFieldName(field);
      NotificationActions.add({
        title: `Invalid ${fieldLabel}`,
        message: `Could not parse "${rawValue.trim()}". Use formats like "65", "65-68", "65 68", ">300", or "<200".`,
        level: 'error',
        position: 'tc',
        autoDismiss: 8,
      });
      // handleInputChange has been syncing the raw keystrokes into the model on every keypress.
      // Clear both the input and the model fields so an invalid value isn't persisted.
      this.input.value = '';
      onChange(field, '', '', '');
      return;
    }

    if (parsed.kind === 'empty') {
      this.input.value = '';
      onChange(field, '', '', '');
      return;
    }

    this.input.value = parsed.label;
    onChange(field, parsed.lower, parsed.upper, parsed.label);
  }

  render() {
    const {
      addon, disabled, label, tipOnText, value,
      alternativeActive, alternativeLabel, alternativeToggleLabel,
      alternativeToggleTooltip, onAlternativeToggle, field
    } = this.props;

    const showAlternative = Boolean(alternativeActive);
    const inputValue = showAlternative ? alternativeLabel : value;
    const inputDisabled = disabled || showAlternative;

    return (
      <Form.Group size="sm">
        <Form.Label>{label}</Form.Label>
        <InputGroup data-cy={"cy_"+label}>
          <Form.Control
            title={showAlternative ? alternativeLabel : tipOnText}
            type="text"
            disabled={inputDisabled}
            value={inputValue}
            ref={(ref) => { this.input = ref; }}
            onChange={(event) => this.handleInputChange(event)}
            onFocus={() => this.handleInputFocus()}
            onBlur={() => this.handleInputBlur()}
          />
          {!showAlternative && <InputGroup.Text>{addon}</InputGroup.Text>}
        </InputGroup>
        {alternativeToggleLabel && onAlternativeToggle && (
          <div className="mt-1">
            <Form.Check
              type="checkbox"
              id={`alt_toggle_${field}`}
              checked={showAlternative}
              disabled={disabled}
              label={alternativeToggleLabel}
              title={alternativeToggleTooltip || alternativeToggleLabel}
              onChange={(e) => onAlternativeToggle(e.target.checked)}
              className="text-range-alternative-checkbox"
            />
          </div>
        )}
      </Form.Group>
    );
  }
}

TextRangeWithAddon.propTypes = {
  field: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.string,
  addon: PropTypes.string,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  tipOnText: PropTypes.string,
  alternativeActive: PropTypes.bool,
  alternativeLabel: PropTypes.string,
  alternativeToggleLabel: PropTypes.string,
  alternativeToggleTooltip: PropTypes.string,
  onAlternativeToggle: PropTypes.func,
};

TextRangeWithAddon.defaultProps = {
  label: '',
  value: '',
  addon: '',
  disabled: false,
  onChange: () => {},
  tipOnText: '',
  alternativeActive: false,
  alternativeLabel: '',
  alternativeToggleLabel: '',
  alternativeToggleTooltip: '',
  onAlternativeToggle: null,
};

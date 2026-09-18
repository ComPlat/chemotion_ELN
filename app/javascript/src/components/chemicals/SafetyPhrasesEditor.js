import React, {
  useEffect, useMemo, useState, useCallback, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import { Select } from 'src/components/common/Select';
import {
  loadHazardPhrases,
  loadPrecautionaryPhrases,
  loadPictograms,
} from 'src/utilities/chemicalDataValidations';

const trim = (v) => (typeof v === 'string' ? v.trim() : '');

const formatStatementValue = (text) => {
  const t = trim(text);
  return t ? ` ${t}` : '';
};

const prettyPictogramName = (file) => trim(file).replace(/\.[A-Za-z0-9]+$/, '').replace(/_/g, ' ');

// Only allow known GHS pictogram codes (GHS01–GHS09). This guards against path-traversal
// and XSS via the /images/ghs/${code}.svg interpolation in PictogramCard.
const VALID_PICTOGRAM_CODE_RE = /^GHS0[1-9]$/;

export const normalizeSafetyPhrases = (value) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const h = source.h_statements && typeof source.h_statements === 'object' && !Array.isArray(source.h_statements)
    ? source.h_statements : {};
  const p = source.p_statements && typeof source.p_statements === 'object' && !Array.isArray(source.p_statements)
    ? source.p_statements : {};
  const pictograms = Array.isArray(source.pictograms)
    ? source.pictograms.filter((c) => typeof c === 'string' && VALID_PICTOGRAM_CODE_RE.test(c)) : [];
  return { h_statements: h, p_statements: p, pictograms };
};

const buildOptions = (dictionary, excluded, formatLabel) => (
  Object.entries(dictionary || {})
    .filter(([code]) => !excluded.has(code))
    .map(([code, v]) => ({ value: code, text: trim(v), label: formatLabel(code, v) }))
);

const PhraseListItem = ({ code, text, onDelete }) => {
  return (
    <li
      className="list-group-item d-flex align-items-center gap-2 py-1"
      data-component="SafetyPhraseRow"
      data-code={code}
    >
      <div className="me-auto text-break">
        <strong>{`${code}:`}</strong>
        {` ${text}`}
      </div>
      <Button
        size="xsm"
        variant="danger"
        onClick={onDelete}
        title={`Remove ${code}`}
        aria-label={`Remove ${code}`}
        data-action="remove"
      >
        <i className="fa fa-trash-o" />
      </Button>
    </li>
  );
}

PhraseListItem.propTypes = {
  code: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const itemShape = PropTypes.shape({
  code: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired,
});

const optionShape = PropTypes.shape({
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  text: PropTypes.string,
});

// Folds the way the safety tab's own sections do, and starts closed while it holds
// nothing so an untouched sample shows three headings rather than three empty forms.
const CollapsibleSection = ({
  title, count, className, dataComponent, children,
}) => {
  const [open, setOpen] = useState(count > 0);
  const wasEmpty = useRef(count === 0);

  // Fetching phrases fills a section from outside; it should not stay shut on its answer.
  useEffect(() => {
    if (wasEmpty.current && count > 0) setOpen(true);
    wasEmpty.current = count === 0;
  }, [count]);

  return (
    <div className={className} data-component={dataComponent}>
      <h6 className="text-primary mb-2">
        <Button
          variant="link"
          size="sm"
          className="p-0 text-decoration-none text-reset align-baseline"
          aria-expanded={open}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          <i className={`fa fa-caret-${open ? 'down' : 'right'} me-2`} />
          {title}
        </Button>
        <span className="text-muted small fw-normal ms-2">{count === 0 ? 'none added yet' : count}</span>
      </h6>
      <div hidden={!open}>{children}</div>
    </div>
  );
};

CollapsibleSection.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  className: PropTypes.string,
  dataComponent: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

CollapsibleSection.defaultProps = { className: 'mb-4' };

const PhraseSection = ({
  title, idPrefix, options, items, onAdd, disabled,
}) => {
  return (
    <CollapsibleSection title={title} count={items.length} dataComponent={idPrefix}>
      <Select
        inputId={`${idPrefix}-select`}
        classNamePrefix={`${idPrefix}-select`}
        placeholder={disabled ? 'Loading…' : `Search and add ${title.toLowerCase()}`}
        options={options}
        value={null}
        isDisabled={disabled}
        isClearable
        onChange={onAdd}
        noOptionsMessage={() => 'No matching items'}
      />
      {items.length > 0 && (
        <ol className="list-group list-group-numbered mt-2" data-component={`${idPrefix}-list`}>
          {items.map((item) => (
            <PhraseListItem
              key={item.code}
              code={item.code}
              text={item.text}
              onDelete={item.onDelete}
            />
          ))}
        </ol>
      )}
    </CollapsibleSection>
  );
}

PhraseSection.propTypes = {
  title: PropTypes.string.isRequired,
  idPrefix: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(optionShape).isRequired,
  items: PropTypes.arrayOf(itemShape).isRequired,
  onAdd: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

PhraseSection.defaultProps = { disabled: false };

const PictogramCard = ({ code, name, onDelete }) => {
  return (
    <div
      className="d-flex flex-column align-items-center border rounded p-2 position-relative bg-body-secondary"
      data-component="SafetyPhraseRow"
      data-code={code}
      style={{ width: '100px', minHeight: '110px' }}
    >
      <Button
        size="xsm"
        variant="danger"
        onClick={onDelete}
        title={`Remove ${code}`}
        aria-label={`Remove ${code}`}
        data-action="remove"
        className="position-absolute top-0 end-0 m-1"
      >
        <i className="fa fa-trash-o" />
      </Button>
      <SVG
        src={`/images/ghs/${code}.svg`}
        style={{ width: 70, height: 70, marginTop: '18px' }}
      />
      <small className="fw-bold text-center mt-1" style={{ fontSize: '0.7rem' }}>{code}</small>
      <small className="text-center text-muted" style={{ fontSize: '0.65rem', lineHeight: '1.1' }}>
        {name}
      </small>
    </div>
  );
}

PictogramCard.propTypes = {
  code: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const PictogramSection = ({
  options, items, onAdd, disabled,
}) => {
  return (
    <CollapsibleSection
      title="Pictograms"
      count={items.length}
      className="mb-2"
      dataComponent="safety-pictograms"
    >
      <Select
        inputId="safety-pictograms-select"
        classNamePrefix="safety-pictograms-select"
        placeholder={disabled ? 'Loading…' : 'Search and add pictograms'}
        options={options}
        value={null}
        isDisabled={disabled}
        isClearable
        onChange={onAdd}
        noOptionsMessage={() => 'No matching items'}
      />
      {items.length > 0 && (
        <div
          className="d-flex flex-wrap gap-2 mt-2"
          data-component="safety-pictograms-list"
        >
          {items.map((item) => (
            <PictogramCard
              key={item.code}
              code={item.code}
              name={item.text}
              onDelete={item.onDelete}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

PictogramSection.propTypes = {
  options: PropTypes.arrayOf(optionShape).isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({
    code: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    onDelete: PropTypes.func.isRequired,
  })).isRequired,
  onAdd: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

PictogramSection.defaultProps = { disabled: false };

const SafetyPhrasesEditor = ({ value, onChange }) => {
  const [hazardDict, setHazardDict] = useState({});
  const [precautionaryDict, setPrecautionaryDict] = useState({});
  const [pictogramDict, setPictogramDict] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadHazardPhrases(),
      loadPrecautionaryPhrases(),
      loadPictograms(),
    ]).then(([h, p, g]) => {
      if (!mounted) return;
      setHazardDict(h);
      setPrecautionaryDict(p);
      setPictogramDict(g);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  // `data` identity changes whenever any phrase field changes — useMemo deps below
  // intentionally use `data` (not data.h_statements) so that item lists always
  // capture a fresh handler closure even when an unrelated section changes.
  const data = useMemo(() => normalizeSafetyPhrases(value), [value]);

  const emit = useCallback((next) => {
    if (typeof onChange === 'function') onChange(next);
  }, [onChange]);

  const handleAddH = useCallback((option) => {
    if (!option || !option.value) return;
    const text = option.text || trim(hazardDict[option.value]);
    emit({ ...data, h_statements: { ...data.h_statements, [option.value]: formatStatementValue(text) } });
  }, [data, emit, hazardDict]);

  const handleRemoveH = useCallback((code) => {
    const next = { ...data.h_statements };
    delete next[code];
    emit({ ...data, h_statements: next });
  }, [data, emit]);

  const handleAddP = useCallback((option) => {
    if (!option || !option.value) return;
    const text = option.text || trim(precautionaryDict[option.value]);
    emit({ ...data, p_statements: { ...data.p_statements, [option.value]: formatStatementValue(text) } });
  }, [data, emit, precautionaryDict]);

  const handleRemoveP = useCallback((code) => {
    const next = { ...data.p_statements };
    delete next[code];
    emit({ ...data, p_statements: next });
  }, [data, emit]);

  const handleAddPictogram = useCallback((option) => {
    const code = trim(option && option.value);
    if (!code || !VALID_PICTOGRAM_CODE_RE.test(code) || data.pictograms.includes(code)) return;
    emit({ ...data, pictograms: [...data.pictograms, code] });
  }, [data, emit]);

  const handleRemovePictogram = useCallback((code) => {
    emit({ ...data, pictograms: data.pictograms.filter((c) => c !== code) });
  }, [data, emit]);

  // Use `data` (not data.h_statements) as the key dep so that onDelete closures
  // are always fresh — avoids stale-closure cascade-delete bug when an unrelated
  // section is mutated and data identity changes but the sub-key does not.
  const hazardItems = useMemo(() => (
    Object.entries(data.h_statements).map(([code, text]) => ({
      code,
      text: trim(text) || trim(hazardDict[code]),
      onDelete: () => handleRemoveH(code),
    }))
  ), [data, hazardDict, handleRemoveH]);

  const precautionaryItems = useMemo(() => (
    Object.entries(data.p_statements).map(([code, text]) => ({
      code,
      text: trim(text) || trim(precautionaryDict[code]),
      onDelete: () => handleRemoveP(code),
    }))
  ), [data, precautionaryDict, handleRemoveP]);

  const pictogramItems = useMemo(() => (
    data.pictograms.map((code) => ({
      code,
      text: prettyPictogramName(pictogramDict[code]) || code,
      onDelete: () => handleRemovePictogram(code),
    }))
  ), [data, pictogramDict, handleRemovePictogram]);

  const hazardOptions = useMemo(() => (
    buildOptions(hazardDict, new Set(Object.keys(data.h_statements)), (code, text) => `${code}: ${trim(text)}`)
  ), [hazardDict, data.h_statements]);

  const precautionaryOptions = useMemo(() => (
    buildOptions(precautionaryDict, new Set(Object.keys(data.p_statements)), (code, text) => `${code}: ${trim(text)}`)
  ), [precautionaryDict, data.p_statements]);

  const pictogramOptions = useMemo(() => (
    buildOptions(pictogramDict, new Set(data.pictograms), (code, file) => `${code}: ${prettyPictogramName(file)}`)
  ), [pictogramDict, data.pictograms]);

  return (
    <div
      className="border rounded p-3 mt-1 w-100 bg-body"
      data-component="SafetyPhrasesEditor"
      style={{ maxHeight: '500px', overflow: 'auto' }}
    >
      <PhraseSection
        title="Hazard Statements"
        idPrefix="safety-h-phrases"
        options={hazardOptions}
        items={hazardItems}
        onAdd={handleAddH}
        disabled={loading}
      />
      <PhraseSection
        title="Precautionary Statements"
        idPrefix="safety-p-phrases"
        options={precautionaryOptions}
        items={precautionaryItems}
        onAdd={handleAddP}
        disabled={loading}
      />
      <PictogramSection
        options={pictogramOptions}
        items={pictogramItems}
        onAdd={handleAddPictogram}
        disabled={loading}
      />
    </div>
  );
}

SafetyPhrasesEditor.propTypes = {
  value: PropTypes.shape({
    h_statements: PropTypes.objectOf(PropTypes.string),
    p_statements: PropTypes.objectOf(PropTypes.string),
    pictograms: PropTypes.arrayOf(PropTypes.string),
  }),
  onChange: PropTypes.func.isRequired,
};

SafetyPhrasesEditor.defaultProps = {
  value: null,
};

export default SafetyPhrasesEditor;

/* eslint-disable react/forbid-prop-types */
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonGroup, Form, Modal,
} from 'react-bootstrap';

const previewAnalyses = (ids, analyses) => {
  if (!Array.isArray(ids) || ids.length === 0) return '';
  const byId = {};
  (analyses || []).forEach((a) => { byId[a.id] = a; });
  return ids.map((id) => byId[id]?.name || `#${id}`).join(', ');
};

// ---- cell editors ------------------------------------------------------

export const selectColumnAttrs = (selectOptions) => {
  if (!Array.isArray(selectOptions) || selectOptions.length === 0) return null;
  const labelByKey = new Map(selectOptions.map((o) => [String(o.key), o.label]));
  return {
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['', ...selectOptions.map((o) => String(o.key))] },
    valueFormatter: (p) => {
      if (p.value === null || p.value === undefined || p.value === '') return '';
      return labelByKey.get(String(p.value)) ?? String(p.value);
    },
  };
};

const MultiSelectCellEditor = (props) => {
  const {
    value, onValueChange, stopEditing, selectOptions, fieldLabel,
  } = props;
  const initial = useMemo(() => {
    if (Array.isArray(value)) return value.map((v) => String(v));
    if (typeof value === 'string' && value !== '') {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [value]);
  const [selected, setSelected] = useState(initial);

  const toggle = (key) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const onCancel = () => stopEditing(true);
  const onSave = () => {
    onValueChange(selected);
    stopEditing();
  };

  return (
    <Modal show onHide={onCancel} size="sm">
      <Modal.Header closeButton className="justify-content-center">
        <Modal.Title className="text-center w-100">Multiple Selection</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        {fieldLabel && (
          <p className="text-muted small mb-2">{fieldLabel}</p>
        )}
        {(selectOptions || []).map((opt) => (
          <Form.Check
            key={opt.key}
            type="checkbox"
            id={`gev-multi-${opt.key}`}
            label={opt.label}
            checked={selected.includes(String(opt.key))}
            onChange={() => toggle(String(opt.key))}
          />
        ))}
        {(!selectOptions || selectOptions.length === 0) && (
          <p className="text-muted mb-0">No options available.</p>
        )}
      </Modal.Body>
      <Modal.Footer className="justify-content-start">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onSave}>OK</Button>
      </Modal.Footer>
    </Modal>
  );
};
MultiSelectCellEditor.propTypes = {
  value: PropTypes.any,
  onValueChange: PropTypes.func.isRequired,
  stopEditing: PropTypes.func.isRequired,
  selectOptions: PropTypes.array,
  fieldLabel: PropTypes.string,
};
MultiSelectCellEditor.defaultProps = {
  value: null,
  selectOptions: [],
  fieldLabel: '',
};

export const multiSelectColumnAttrs = (selectOptions, fieldLabel) => {
  if (!Array.isArray(selectOptions) || selectOptions.length === 0) return null;
  const labelByKey = new Map(selectOptions.map((o) => [String(o.key), o.label]));
  return {
    cellEditor: MultiSelectCellEditor,
    cellEditorPopup: true,
    cellEditorParams: { selectOptions, fieldLabel },
    valueFormatter: (p) => {
      let arr = [];
      if (Array.isArray(p.value)) arr = p.value;
      else if (typeof p.value === 'string' && p.value !== '') arr = p.value.split(',');
      if (arr.length === 0) return '';
      return arr.map((k) => labelByKey.get(String(k)) ?? String(k)).join(', ');
    },
  };
};

// ---- ag-grid header components ----------------------------------------

const UnitToggle = ({ currentUnit, units, onCycle }) => {
  if (!units || units.length < 1) return null;
  if (units.length === 1) {
    return <span className="gev-unit-pill gev-unit-pill-static">{currentUnit || units[0]}</span>;
  }
  return (
    <button
      type="button"
      className="gev-unit-pill gev-unit-pill-clickable"
      onClick={(e) => { e.stopPropagation(); onCycle(); }}
      title="Click to cycle units"
    >
      {currentUnit || units[0]}
    </button>
  );
};
UnitToggle.propTypes = {
  currentUnit: PropTypes.string,
  units: PropTypes.array.isRequired,
  onCycle: PropTypes.func.isRequired,
};
UnitToggle.defaultProps = { currentUnit: '' };

const HeaderDragGrip = () => (
    <span
      className="gev-header-grip"
      aria-hidden="true"
      title="Drag to reorder column"
    />
  );

export const PropertyHeader = (params) => {
  const {
    fieldLabel, unitsInfo, currentUnit, propertyKey, onToggleUnit,
  } = params;
  return (
    <span className="gev-header-label gev-header-moveable">
      <HeaderDragGrip />
      <span className="gev-header-text gev-header-field" title={fieldLabel}>{fieldLabel}</span>
      {unitsInfo && (
        <UnitToggle
          currentUnit={currentUnit}
          units={unitsInfo.units}
          onCycle={() => onToggleUnit(propertyKey, unitsInfo)}
        />
      )}
    </span>
  );
};

export const SegmentLeafHeader = (params) => {
  const {
    layerLabel, fieldLabel, unitsInfo, currentUnit, segmentKlassId, fieldKey, onToggleUnit,
  } = params;
  return (
    <span className="gev-header-label gev-header-two-line gev-header-moveable">
      <HeaderDragGrip />
      <span className="gev-header-text-stack">
        <span className="gev-header-text gev-header-layer" title={layerLabel}>{layerLabel}</span>
        <span className="gev-header-field-row">
          <span className="gev-header-text gev-header-field" title={fieldLabel}>{fieldLabel}</span>
          {unitsInfo && (
            <UnitToggle
              currentUnit={currentUnit}
              units={unitsInfo.units}
              onCycle={() => onToggleUnit(segmentKlassId, fieldKey, unitsInfo)}
            />
          )}
        </span>
      </span>
    </span>
  );
};

export const SegmentGroupHeader = (params) => {
  const { displayName } = params;
  return (
    <span className="gev-group-label gev-header-moveable">
      <HeaderDragGrip />
      {displayName}
    </span>
  );
};

export const MetadataHeader = (params) => {
  const { displayName } = params;
  return (
    <span className="gev-header-label gev-header-moveable">
      <HeaderDragGrip />
      <span className="gev-header-text">{displayName}</span>
    </span>
  );
};

// ---- cell renderers ----------------------------------------------------

export const ActionsCellRenderer = (params) => {
  const { data, onDuplicate, onDelete } = params;
  if (!data) return null;
  return (
    <ButtonGroup size="sm" className="gev-actions">
      <Button
        variant="outline-success"
        onClick={() => onDuplicate(data.uuid)}
        title="Duplicate"
      >
        <i className="fa fa-clone" aria-hidden="true" />
      </Button>
      <Button
        variant="outline-danger"
        onClick={() => onDelete(data.uuid)}
        title="Delete"
      >
        <i className="fa fa-trash" aria-hidden="true" />
      </Button>
    </ButtonGroup>
  );
};

export const NotesCellRenderer = (params) => {
  const { data, onEdit } = params;
  if (!data) return null;
  const text = (data.metadata && data.metadata.notes) || '';
  const hasNotes = text.trim().length > 0;
  return (
    <>
      <ButtonGroup size="sm" className="gev-actions">
        <Button
          variant={hasNotes ? 'success' : 'outline-secondary'}
          onClick={() => onEdit(data.uuid, text)}
          title="Edit notes"
        >
          <i className="fa fa-pencil" aria-hidden="true" />
        </Button>
      </ButtonGroup>
      <span
        className="small text-muted ms-2"
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {text}
      </span>
    </>
  );
};

export const AnalysesCellRenderer = (params) => {
  const { data, analyses, onEdit } = params;
  if (!data) return null;
  const ids = Array.isArray(data.metadata?.analyses) ? data.metadata.analyses : [];
  const hasAnalyses = ids.length > 0;
  return (
    <>
      <ButtonGroup size="sm" className="gev-actions">
        <Button
          variant={hasAnalyses ? 'success' : 'outline-secondary'}
          onClick={() => onEdit(data.uuid, ids)}
          title="Link analyses"
        >
          <i className="fa fa-link" aria-hidden="true" />
          {hasAnalyses && <span className="ms-1">{ids.length}</span>}
        </Button>
      </ButtonGroup>
      <span className="small text-muted ms-2">
        {previewAnalyses(ids, analyses)}
      </span>
    </>
  );
};

export const LayerAnalysesCellRenderer = (params) => {
  const {
    data, analyses, propertyKey, onEdit,
  } = params;
  if (!data) return null;
  const cell = data.properties && data.properties[propertyKey];
  const ids = Array.isArray(cell?.value) ? cell.value : [];
  const hasAnalyses = ids.length > 0;
  return (
    <>
      <ButtonGroup size="sm" className="gev-actions">
        <Button
          variant={hasAnalyses ? 'success' : 'outline-secondary'}
          onClick={() => onEdit(data.uuid, propertyKey, ids)}
          title="Link analyses"
        >
          <i className="fa fa-link" aria-hidden="true" />
          {hasAnalyses && <span className="ms-1">{ids.length}</span>}
        </Button>
      </ButtonGroup>
      <span className="small text-muted ms-2">
        {previewAnalyses(ids, analyses)}
      </span>
    </>
  );
};

export const SegmentPlaceholderRenderer = (params) => {
  const { data, segmentKlassId, onSnapshot } = params;
  if (!data) return null;
  const snap = (data.segments && data.segments[segmentKlassId]) || {};
  const keys = Object.keys(snap);
  return (
    <div className="d-flex align-items-start gap-2 py-1">
      <div className="small text-muted flex-grow-1">
        {keys.length === 0 ? <em>—</em> : keys.slice(0, 3).map((k) => `${k}: ${snap[k]}`).join(', ')}
      </div>
      <Button
        size="sm"
        variant="outline-secondary"
        onClick={() => onSnapshot(data.uuid, segmentKlassId)}
      >
        Capture
      </Button>
    </div>
  );
};

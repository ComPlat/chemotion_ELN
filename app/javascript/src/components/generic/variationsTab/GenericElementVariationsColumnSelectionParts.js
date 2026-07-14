/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, Form } from 'react-bootstrap';

export const SectionHeader = ({
  title, selectedCount, totalCount, onSelectAll, onClear,
  selectAllDisabled, clearDisabled,
}) => (
  <div className="d-flex justify-content-between align-items-center mb-2">
    <h6 className="mb-0">
      {title}
      {' '}
      <span className="text-muted small fw-normal">
        (
        {selectedCount}
        /
        {totalCount}
        {' '}
        selected)
      </span>
    </h6>
    <div>
      <Button
        variant="link"
        size="sm"
        className="p-0 me-3"
        onClick={onSelectAll}
        disabled={selectAllDisabled}
      >
        Select all
      </Button>
      <Button
        variant="link"
        size="sm"
        className="p-0 text-danger"
        onClick={onClear}
        disabled={clearDisabled}
      >
        Clear
      </Button>
    </div>
  </div>
);

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  selectedCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  onSelectAll: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  selectAllDisabled: PropTypes.bool,
  clearDisabled: PropTypes.bool,
};

SectionHeader.defaultProps = {
  selectAllDisabled: false,
  clearDisabled: false,
};

export const SegmentFieldList = ({
  segment,
  visibleFieldOptions,
  selectedFieldKeys,
  onToggleFieldKey,
  onSelectAllFields,
  onClearFields,
}) => {
  if (!segment.fieldOptions || segment.fieldOptions.length === 0) {
    return (
      <p className="small text-muted ms-4 mb-2">
        No fields available in this segment.
      </p>
    );
  }
  if (visibleFieldOptions.length === 0) {
    return (
      <p className="small text-muted ms-4 mb-2">No fields match your search.</p>
    );
  }
  const visibleKeys = visibleFieldOptions.map((o) => o.fieldKey);
  const visibleSelectedCount = visibleKeys.filter((k) => selectedFieldKeys.includes(k)).length;
  return (
    <div className="ms-4 mb-2 gev-segment-fields">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="small text-muted">
          {visibleSelectedCount}
          /
          {visibleKeys.length}
          {' '}
          fields selected
        </span>
        <div>
          <Button
            variant="link"
            size="sm"
            className="p-0 me-3"
            onClick={onSelectAllFields}
            disabled={visibleSelectedCount === visibleKeys.length}
          >
            Select all
          </Button>
          <Button
            variant="link"
            size="sm"
            className="p-0 text-danger"
            onClick={onClearFields}
            disabled={visibleSelectedCount === 0}
          >
            Clear
          </Button>
        </div>
      </div>
      <div className="gev-segment-field-grid">
        {visibleFieldOptions.map((opt) => {
          const rowKey = `${opt.layerKey}:${opt.fieldKey}`;
          return (
            <Form.Check
              key={rowKey}
              type="checkbox"
              id={`gev-seg-${segment.klassId}-${rowKey}`}
              label={(
                <span>
                  <span className="text-muted small me-1">{opt.layerLabel}</span>
                  <span>{opt.fieldLabel}</span>
                </span>
              )}
              checked={selectedFieldKeys.includes(opt.fieldKey)}
              onChange={() => onToggleFieldKey(segment.klassId, opt.fieldKey)}
            />
          );
        })}
      </div>
    </div>
  );
};

SegmentFieldList.propTypes = {
  segment: PropTypes.object.isRequired,
  visibleFieldOptions: PropTypes.array.isRequired,
  selectedFieldKeys: PropTypes.array.isRequired,
  onToggleFieldKey: PropTypes.func.isRequired,
  onSelectAllFields: PropTypes.func.isRequired,
  onClearFields: PropTypes.func.isRequired,
};

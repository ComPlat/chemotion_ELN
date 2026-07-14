/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Button, Form, InputGroup,
} from 'react-bootstrap';
import {
  METADATA_FIELDS,
  METADATA_LABELS,
} from 'src/components/generic/variationsTab/GenericElementVariationsUtils';
import {
  SectionHeader,
  SegmentFieldList,
} from 'src/components/generic/variationsTab/GenericElementVariationsColumnSelectionParts';

const matches = (query, ...labels) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return labels.some((l) => (l || '').toString().toLowerCase().includes(q));
};

export default function GenericElementVariationsColumnSelection({
  show,
  onHide,
  elementName,
  layerFieldOptions,
  layerOptions,
  selectedPropertyKeys,
  onTogglePropertyKey,
  selectedAnalysisLayers,
  onToggleAnalysisLayer,
  selectedMetadataKeys,
  onToggleMetadataKey,
  segmentOptions,
  selectedSegmentIds,
  onToggleSegmentId,
  selectedSegmentFields,
  onToggleSegmentFieldKey,
}) {
  const [expandedSegments, setExpandedSegments] = useState({});
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!show) setQuery('');
  }, [show]);

  useEffect(() => {
    setExpandedSegments((prev) => {
      const next = { ...prev };
      selectedSegmentIds.forEach((id) => {
        if (!(id in next)) next[id] = true;
      });
      Object.keys(next).forEach((id) => {
        const numeric = Number(id);
        const key = Number.isNaN(numeric) ? id : numeric;
        if (!selectedSegmentIds.includes(key)) delete next[id];
      });
      return next;
    });
  }, [selectedSegmentIds]);

  const toggleSegmentExpand = (id) => {
    setExpandedSegments((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // --- grouped + filtered layer fields ---------------------------------
  const layerFieldGroups = useMemo(() => {
    const byLayer = {};
    const order = [];
    const ensure = (lk, label) => {
      if (!(lk in byLayer)) {
        byLayer[lk] = { layerLabel: label || lk, options: [] };
        order.push(lk);
      }
    };
    // Seed with every element layer so layers without variation-eligible
    // fields still expose their "Link Analyses" option.
    layerOptions.forEach((l) => ensure(l.layerKey, l.layerLabel));
    layerFieldOptions.forEach((opt) => {
      const lk = opt.layerKey || '__nolayer';
      ensure(lk, opt.layerLabel || lk);
      byLayer[lk].options.push(opt);
    });
    return order.map((lk) => ({ layerKey: lk, ...byLayer[lk] }));
  }, [layerFieldOptions, layerOptions]);

  const filteredLayerFieldGroups = useMemo(() => (
    layerFieldGroups
      .map((grp) => {
        const groupHit = matches(query, grp.layerLabel);
        const showAnalyses = !query || groupHit || matches(query, 'Link Analyses', 'analyses');
        const filtered = groupHit
          ? grp.options
          : grp.options.filter((opt) => matches(query, opt.fieldLabel, opt.label));
        return {
          ...grp, options: filtered, showAnalyses,
        };
      })
      .filter((grp) => grp.options.length > 0 || grp.showAnalyses)
  ), [layerFieldGroups, query]);

  const visiblePropertyKeys = useMemo(() => (
    filteredLayerFieldGroups.flatMap((g) => g.options.map((o) => o.key))
  ), [filteredLayerFieldGroups]);

  // --- filtered segments -----------------------------------------------
  const filteredSegments = useMemo(() => (
    segmentOptions
      .map((seg) => {
        const segHit = matches(query, seg.label);
        const visibleFieldOptions = segHit
          ? (seg.fieldOptions || [])
          : (seg.fieldOptions || [])
            .filter((opt) => matches(query, opt.fieldLabel, opt.layerLabel, opt.label));
        if (!query || segHit || visibleFieldOptions.length > 0) {
          return { seg, visibleFieldOptions };
        }
        return null;
      })
      .filter(Boolean)
  ), [segmentOptions, query]);

  useEffect(() => {
    if (!query) return;
    setExpandedSegments((prev) => {
      const next = { ...prev };
      filteredSegments.forEach(({ seg }) => {
        if (selectedSegmentIds.includes(seg.klassId)) next[seg.klassId] = true;
      });
      return next;
    });
  }, [query, filteredSegments, selectedSegmentIds]);

  // --- filtered metadata -----------------------------------------------
  const visibleMetadataFields = useMemo(() => (
    METADATA_FIELDS.filter((field) => matches(query, METADATA_LABELS[field] || field))
  ), [query]);

  // --- section counts for headers --------------------------------------
  const visibleSelectedPropertyCount = visiblePropertyKeys
    .filter((k) => selectedPropertyKeys.includes(k)).length;

  const visibleSegmentIds = filteredSegments.map(({ seg }) => seg.klassId);
  const visibleSelectedSegmentCount = visibleSegmentIds
    .filter((id) => selectedSegmentIds.includes(id)).length;

  const visibleSelectedMetadataCount = visibleMetadataFields
    .filter((f) => selectedMetadataKeys.includes(f)).length;

  // --- bulk handlers ---------------------------------------------------
  const selectAllProperties = () => {
    visiblePropertyKeys.forEach((k) => {
      if (!selectedPropertyKeys.includes(k)) onTogglePropertyKey(k);
    });
  };
  const clearProperties = () => {
    visiblePropertyKeys.forEach((k) => {
      if (selectedPropertyKeys.includes(k)) onTogglePropertyKey(k);
    });
  };

  const selectAllSegments = () => {
    visibleSegmentIds.forEach((id) => {
      if (!selectedSegmentIds.includes(id)) onToggleSegmentId(id);
    });
  };
  const clearSegments = () => {
    visibleSegmentIds.forEach((id) => {
      if (selectedSegmentIds.includes(id)) onToggleSegmentId(id);
    });
  };

  const selectAllMetadata = () => {
    visibleMetadataFields.forEach((f) => {
      if (!selectedMetadataKeys.includes(f)) onToggleMetadataKey(f);
    });
  };
  const clearMetadata = () => {
    visibleMetadataFields.forEach((f) => {
      if (selectedMetadataKeys.includes(f)) onToggleMetadataKey(f);
    });
  };

  const selectAllFieldsForSegment = (klassId, visibleFieldOptions) => {
    const selected = selectedSegmentFields[klassId] || [];
    visibleFieldOptions.forEach((opt) => {
      if (!selected.includes(opt.fieldKey)) onToggleSegmentFieldKey(klassId, opt.fieldKey);
    });
  };
  const clearFieldsForSegment = (klassId, visibleFieldOptions) => {
    const selected = selectedSegmentFields[klassId] || [];
    visibleFieldOptions.forEach((opt) => {
      if (selected.includes(opt.fieldKey)) onToggleSegmentFieldKey(klassId, opt.fieldKey);
    });
  };

  const nothingMatches = query
    && filteredLayerFieldGroups.length === 0
    && filteredSegments.length === 0
    && visibleMetadataFields.length === 0;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered className="app-modal">
      <Modal.Header closeButton>
        <Modal.Title>Select columns</Modal.Title>
      </Modal.Header>
      <Modal.Body className="gev-column-modal-body">
        <InputGroup className="mb-3 gev-column-search">
          <InputGroup.Text>
            <i className="fa fa-search" aria-hidden="true" />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search properties, segments, fields, metadata…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <Button
              variant="outline-secondary"
              onClick={() => setQuery('')}
              title="Clear search"
            >
              <i className="fa fa-times" aria-hidden="true" />
            </Button>
          )}
        </InputGroup>

        {nothingMatches && (
          <p className="text-muted">
            No columns match
            {' '}
            &quot;
            {query}
            &quot;.
          </p>
        )}

        {filteredLayerFieldGroups.length > 0 && (
          <section className="mb-4">
            <SectionHeader
              title={`${elementName || 'Element'} Properties`}
              selectedCount={visibleSelectedPropertyCount}
              totalCount={visiblePropertyKeys.length}
              onSelectAll={selectAllProperties}
              onClear={clearProperties}
              selectAllDisabled={
                visiblePropertyKeys.length === 0
                || visibleSelectedPropertyCount === visiblePropertyKeys.length
              }
              clearDisabled={visibleSelectedPropertyCount === 0}
            />
            {filteredLayerFieldGroups.map((grp) => (
              <div key={grp.layerKey} className="mb-2">
                <div className="gev-layer-heading">{grp.layerLabel}</div>
                {grp.showAnalyses && (
                  <Form.Check
                    type="checkbox"
                    className="gev-layer-analyses-option"
                    id={`gev-layer-analyses-${grp.layerKey}`}
                    label={(
                      <span>
                        <i className="fa fa-link me-1" aria-hidden="true" />
                        Link Analyses
                      </span>
                    )}
                    checked={selectedAnalysisLayers.includes(grp.layerKey)}
                    onChange={() => onToggleAnalysisLayer(grp.layerKey)}
                  />
                )}
                {grp.options.length > 0 && (
                  <div className="gev-checkbox-grid">
                    {grp.options.map((opt) => (
                      <Form.Check
                        key={opt.key}
                        type="checkbox"
                        id={`gev-prop-${opt.key}`}
                        label={opt.fieldLabel}
                        checked={selectedPropertyKeys.includes(opt.key)}
                        onChange={() => onTogglePropertyKey(opt.key)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {!query && layerFieldOptions.length === 0 && layerOptions.length === 0 && (
          <p className="text-muted">No layer fields available for this element.</p>
        )}

        {filteredSegments.length > 0 && (
          <section className="mb-4">
            <SectionHeader
              title="Segments"
              selectedCount={visibleSelectedSegmentCount}
              totalCount={visibleSegmentIds.length}
              onSelectAll={selectAllSegments}
              onClear={clearSegments}
              selectAllDisabled={
                visibleSegmentIds.length === 0
                || visibleSelectedSegmentCount === visibleSegmentIds.length
              }
              clearDisabled={visibleSelectedSegmentCount === 0}
            />
            {filteredSegments.map(({ seg, visibleFieldOptions }) => {
              const isSelected = selectedSegmentIds.includes(seg.klassId);
              const fieldsForSeg = selectedSegmentFields[seg.klassId] || [];
              const isExpanded = isSelected && expandedSegments[seg.klassId] !== false;
              return (
                <div key={seg.klassId} className="mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <Form.Check
                      type="checkbox"
                      id={`gev-seg-${seg.klassId}`}
                      label={seg.label}
                      checked={isSelected}
                      onChange={() => onToggleSegmentId(seg.klassId)}
                    />
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0"
                      disabled={!isSelected}
                      onClick={() => toggleSegmentExpand(seg.klassId)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Collapse segment fields' : 'Expand segment fields'}
                      title={isExpanded ? 'Collapse segment fields' : 'Expand segment fields'}
                    >
                      <i
                        className={`fa ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`}
                        aria-hidden="true"
                      />
                    </Button>
                  </div>
                  {isExpanded && (
                    <SegmentFieldList
                      segment={seg}
                      visibleFieldOptions={visibleFieldOptions}
                      selectedFieldKeys={fieldsForSeg}
                      onToggleFieldKey={onToggleSegmentFieldKey}
                      onSelectAllFields={() => selectAllFieldsForSegment(seg.klassId, visibleFieldOptions)}
                      onClearFields={() => clearFieldsForSegment(seg.klassId, visibleFieldOptions)}
                    />
                  )}
                </div>
              );
            })}
          </section>
        )}

        {!query && segmentOptions.length === 0 && (
          <p className="text-muted">No segments available for this element type.</p>
        )}

        {visibleMetadataFields.length > 0 && (
          <section className="mb-2">
            <SectionHeader
              title="Metadata"
              selectedCount={visibleSelectedMetadataCount}
              totalCount={visibleMetadataFields.length}
              onSelectAll={selectAllMetadata}
              onClear={clearMetadata}
              selectAllDisabled={
                visibleMetadataFields.length === 0
                || visibleSelectedMetadataCount === visibleMetadataFields.length
              }
              clearDisabled={visibleSelectedMetadataCount === 0}
            />
            <div className="gev-checkbox-grid">
              {visibleMetadataFields.map((field) => (
                <Form.Check
                  key={field}
                  type="checkbox"
                  id={`gev-meta-${field}`}
                  label={METADATA_LABELS[field] || field}
                  checked={selectedMetadataKeys.includes(field)}
                  onChange={() => onToggleMetadataKey(field)}
                />
              ))}
            </div>
          </section>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

GenericElementVariationsColumnSelection.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  elementName: PropTypes.string,
  layerFieldOptions: PropTypes.array.isRequired,
  layerOptions: PropTypes.array.isRequired,
  selectedPropertyKeys: PropTypes.array.isRequired,
  onTogglePropertyKey: PropTypes.func.isRequired,
  selectedAnalysisLayers: PropTypes.array.isRequired,
  onToggleAnalysisLayer: PropTypes.func.isRequired,
  selectedMetadataKeys: PropTypes.array.isRequired,
  onToggleMetadataKey: PropTypes.func.isRequired,
  segmentOptions: PropTypes.array.isRequired,
  selectedSegmentIds: PropTypes.array.isRequired,
  onToggleSegmentId: PropTypes.func.isRequired,
  selectedSegmentFields: PropTypes.object.isRequired,
  onToggleSegmentFieldKey: PropTypes.func.isRequired,
};

GenericElementVariationsColumnSelection.defaultProps = {
  elementName: '',
};

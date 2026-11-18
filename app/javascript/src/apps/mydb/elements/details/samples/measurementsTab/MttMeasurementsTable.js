import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, Badge, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Aviator from 'aviator';
import { genericElShowOrNew } from 'src/utilities/routesUtils';
import moment from 'moment';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ConfirmModal from 'src/components/common/ConfirmModal';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { normalizeMttResult } from 'src/utilities/mttDataProcessor';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';

const fmt = (value, unit = '') => {
  // Coerce first: external-app values may arrive as numeric strings.
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num)
    ? `${num.toFixed(4)}${unit ? ` ${unit}` : ''}`
    : '-';
};

const fmtNum = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(num)) return '-';
  if (num !== 0 && Math.abs(num) < 0.001) return num.toExponential(2);
  return num.toFixed(4);
};

const GENERAL_INFO_FIELDS = [
  'assay_stage',
  'assay_design_method',
  'bioassay_type',
  'assay_format',
  'physical_detection_method',
  'experimental_setting',
  'target',
  'endpoint',
];

const norm = (s) => (s || '').toString().trim().toLowerCase();

const getGeneralInfoFields = (genericEl) => {
  const layer = genericEl?.properties?.layers?.general_information;
  return Array.isArray(layer?.fields) ? layer.fields : [];
};

// Match a field by its key, falling back to the humanized key matched against the label.
const findFieldByKey = (fields, key) => (
  fields.find((f) => norm(f.field) === norm(key))
  || fields.find((f) => norm(f.label) === norm(key).replace(/_+/g, ' '))
);

// Turn a snake_cased field key into a display heading (e.g. "assay_stage" -> "Assay Stage").
const humanizeKey = (key) => (key || '')
  .split('_')
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const fieldValueToText = (field) => {
  const value = field?.value;
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'object') return value.label ?? value.value ?? value.name ?? '-';
  return String(value);
};

class MttMeasurementsTable extends Component {
  static propTypes = {
    sample: PropTypes.object.isRequired,
    measurements: PropTypes.array.isRequired
  };
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      measurementToDelete: null,
      genericElements: {}
    };
    // Tracks in-flight generic-element fetches to avoid duplicate requests.
    this.pendingGenericEls = new Set();
  }

  componentDidMount() {
    this.loadGenericElements();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.measurements !== this.props.measurements) {
      this.loadGenericElements();
    }
  }

  // Fetch each referenced generic element once so its "General Information" can be shown.
  loadGenericElements() {
    const ids = [...new Set(
      (this.props.measurements || [])
        .map((m) => m.metadata?.generic_element_id)
        .filter(Boolean)
    )];

    ids.forEach((id) => {
      if (this.state.genericElements[id] || this.pendingGenericEls.has(id)) return;
      this.pendingGenericEls.add(id);
      GenericElsFetcher.fetchById(id)
        .then((genericEl) => {
          this.setState((prev) => ({
            genericElements: { ...prev.genericElements, [id]: genericEl }
          }));
        })
        .catch(() => { /* leave info as unavailable */ })
        .finally(() => { this.pendingGenericEls.delete(id); });
    });
  }

  navigateToGenericElement(genericElementId) {
    if (genericElementId) {
      const { uri } = Aviator.getCurrentRequest();
      Aviator.navigate(`${uri}/generic_element/${genericElementId}`, { silent: true });
      genericElShowOrNew({ params: { generic_elementID: genericElementId } }, 'generic_element');
    }
  }

  handleDeleteConfirmation(confirmed) {
    if (confirmed) {
      LoadingActions.start();
      this.context.measurements.deleteMeasurement(
        this.state.measurementToDelete.id,
        () => {
          this.setState({ measurementToDelete: null });
          LoadingActions.stop();
        }
      );
    } else {
      this.setState({ measurementToDelete: null });
    }
  }

  renderGeneralInfo(genericElementId) {
    if (!genericElementId) return null;
    const genericEl = this.state.genericElements[genericElementId];
    if (!genericEl) {
      return <p className="text-muted small mb-3">Loading generic element information…</p>;
    }

    const fields = getGeneralInfoFields(genericEl);
    if (fields.length === 0) return null;

    return (
      <div className="row g-2 small mb-3 p-2 bg-light border rounded">
        {GENERAL_INFO_FIELDS.map((key) => {
          const field = findFieldByKey(fields, key);
          return (
            <div className="col-6 col-md-3" key={key}>
              <div className="text-muted">{field?.label || humanizeKey(key)}</div>
              <div className="fw-semibold">{fieldValueToText(field)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    const { measurements } = this.props;
    const { measurementToDelete } = this.state;

    if (!measurements || measurements.length === 0) {
      return <p className="text-muted mb-0">No MTT analysis results available.</p>;
    }

    const analyses = measurements
      .map(m => ({
        id: m.id,
        sampleLabel: m.header?.short_label || '-',
        timestamp: m.metadata?.analysis_timestamp || 'Unknown',
        genericElementId: m.metadata?.generic_element_id,
        elementShortLabel: m.metadata?.element_short_label || '-',
        klassLabel: m.metadata?.element_klass_label || 'Generic Element Analysis',
        result: normalizeMttResult(m.metadata?.results?.[0])
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Group analyses by generic element so each block can show that element's info.
    const grouped = {};
    analyses.forEach((a) => {
      const key = a.genericElementId != null ? String(a.genericElementId) : `klass-${a.klassLabel}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    });
    const groupKeys = Object.keys(grouped);

    return (
      <div>
        {groupKeys.map((key) => (
          <div key={key} className="mb-4">
            <div className="mb-2">
              <h6 className="text-primary mb-0">
                <i className="fa fa-flask me-2" />
                {grouped[key][0].klassLabel}
                {' — '}
                {grouped[key][0].genericElementId ? (
                  <Button
                    variant="link"
                    className="p-0 align-baseline fw-semibold"
                    onClick={() => this.navigateToGenericElement(grouped[key][0].genericElementId)}
                  >
                    {grouped[key][0].elementShortLabel}
                  </Button>
                ) : (
                  <span className="fw-semibold">{grouped[key][0].elementShortLabel}</span>
                )}
                {' '}
                <span className="text-muted fw-normal">({grouped[key].length})</span>
              </h6>
            </div>

            {this.renderGeneralInfo(grouped[key][0].genericElementId)}

            <div style={{ overflowX: 'auto' }}>
              <Table bordered hover size="sm" className="bg-white">
                <thead className="bg-light">
                  <tr>
                    <th>Sample</th>
                    <th style={{ width: '15%' }}>Date</th>
                    <th>Endpoint</th>
                    <th>IC</th>
                    <th>IC Lower</th>
                    <th>IC Upper</th>
                    <th>pIC</th>
                    <th>RSE</th>
                    <th>Hill Coeff.</th>
                    <th>Asymptote 1</th>
                    <th>Asymptote 2</th>
                    <th>Status</th>
                    <th className="text-center" style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[key].map((analysis) => {
                    const { id, sampleLabel, timestamp, result, genericElementId } = analysis;
                    const hasLink = !!genericElementId;

                    return (
                      <tr key={`mtt-analysis-${id}`}>
                        <td className="fw-semibold">{sampleLabel}</td>
                        <td className="small">
                          {timestamp !== 'Unknown' ? moment(timestamp).format('lll') : '-'}
                        </td>
                        <td className="fw-semibold">{result.icLabel}</td>
                        <td>
                          {fmt(result.icRelative, result.unit)}
                        </td>
                        <td>
                          {fmt(result.icRelativeLower)}
                        </td>
                        <td>
                          {fmt(result.icRelativeHigher)}
                        </td>
                        <td>
                          {fmt(result.pIc)}
                        </td>
                        <td>{fmtNum(result.RSE)}</td>
                        <td>{fmtNum(result.HillCoefficient)}</td>
                        <td>{fmtNum(result.asymptote_one)}</td>
                        <td>{fmtNum(result.asymptote_two)}</td>
                        <td>
                          {result.Problems ? (
                            <Badge bg="warning" className="small">{result.Problems}</Badge>
                          ) : (
                            <Badge bg="success" className="small">OK</Badge>
                          )}
                        </td>
                        <td className="text-center">
                          {hasLink && (
                            <OverlayTrigger placement="bottom" overlay={<Tooltip id={`open-ge-${id}`}>Open in Generic Element</Tooltip>}>
                              <Button
                                variant="info"
                                size="sm"
                                onClick={() => this.navigateToGenericElement(genericElementId)}
                                className="me-1"
                                style={{ fontSize: '0.75rem' }}
                              >
                                <i className="fa fa-window-maximize" aria-hidden="true" />
                              </Button>
                            </OverlayTrigger>
                          )}
                          <OverlayTrigger placement="bottom" overlay={<Tooltip id={`delete-${id}`}>Delete measurement</Tooltip>}>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => this.setState({ measurementToDelete: { id, timestamp } })}
                              style={{ fontSize: '0.75rem' }}
                            >
                              <i className="fa fa-trash" />
                            </Button>
                          </OverlayTrigger>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </div>
        ))}

        <ConfirmModal
          showModal={measurementToDelete != null}
          onClick={(confirmed) => this.handleDeleteConfirmation(confirmed)}
          title="Delete Measurement"
          content={measurementToDelete
            ? `Are you sure you want to delete this analysis from ${measurementToDelete.timestamp}?`
            : ''}
        />
      </div>
    );
  }
}

export default MttMeasurementsTable;

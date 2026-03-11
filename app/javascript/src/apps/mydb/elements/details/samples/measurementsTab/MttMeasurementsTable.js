import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, Badge, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Aviator from 'aviator';
import { genericElShowOrNew } from 'src/utilities/routesUtils';
import moment from 'moment';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ConfirmModal from 'src/components/common/ConfirmModal';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

class MttMeasurementsTable extends Component {
  static propTypes = {
    sample: PropTypes.object.isRequired,
    measurements: PropTypes.array.isRequired
  };
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      measurementToDelete: null
    };
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
        klassLabel: m.metadata?.element_klass_label || 'Generic Element Analysis',
        result: m.metadata?.results?.[0] || {}
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Group analyses by klass label
    const grouped = {};
    analyses.forEach(a => {
      if (!grouped[a.klassLabel]) grouped[a.klassLabel] = [];
      grouped[a.klassLabel].push(a);
    });
    const groupKeys = Object.keys(grouped).sort();

    return (
      <div>
        {groupKeys.map(label => (
          <div key={label} className="mb-4">
            <div className="mb-3">
              <h6 className="text-primary mb-0">
                <i className="fa fa-flask me-2" />
                {label} Results ({grouped[label].length})
              </h6>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <Table bordered hover size="sm" className="bg-white">
                <thead className="bg-light">
                  <tr>
                    <th>Sample</th>
                    <th style={{ width: '15%' }}>Date</th>
                    <th>IC50</th>
                    <th>IC50 Lower</th>
                    <th>IC50 Upper</th>
                    <th>pIC50</th>
                    <th>Status</th>
                    <th className="text-center" style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[label].map((analysis) => {
                    const { id, sampleLabel, timestamp, result, genericElementId } = analysis;
                    const hasLink = !!genericElementId;

                    return (
                      <tr key={`mtt-analysis-${id}`}>
                        <td className="fw-semibold">{sampleLabel}</td>
                        <td className="small">
                          {timestamp !== 'Unknown' ? moment(timestamp).format('lll') : '-'}
                        </td>
                        <td>
                          {result.IC50_relative !== undefined ? result.IC50_relative.toFixed(4) : '-'}
                        </td>
                        <td>
                          {result.IC50_relative_lower !== undefined ? result.IC50_relative_lower.toFixed(4) : '-'}
                        </td>
                        <td>
                          {result.IC50_relative_higher !== undefined ? result.IC50_relative_higher.toFixed(4) : '-'}
                        </td>
                        <td>
                          {result.pIC50 !== undefined ? result.pIC50.toFixed(4) : '-'}
                        </td>
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

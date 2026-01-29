import React, { Component } from 'react';
import { Accordion, Button, Table, Badge } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import EmbeddedWellplateGenericEl from 'src/components/generic/wellplatesTab/EmbeddedWellplateGenericEl';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import BoxPlotVisualization from 'src/components/generic/BoxPlotVisualization';

const target = {
  drop(props, monitor) {
    const { dropWellplate } = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType === 'wellplate') {
      dropWellplate(item.element);
    }
  },
  canDrop(_, monitor) {
    const itemType = monitor.getItemType();
    return (itemType === 'wellplate');
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class GenericElWellplates extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedWellplates: [],
      requests: [],
      loadingRequests: false,
      expandedRequestId: null,
    };
    this.handleSelect = this.handleSelect.bind(this);
    this.processWellplates = this.processWellplates.bind(this);
    this.fetchRequests = this.fetchRequests.bind(this);
    this.toggleOutputs = this.toggleOutputs.bind(this);
  }

  componentDidMount() {
    this.fetchRequests();
  }

  fetchRequests() {
    const { genericEl } = this.props;
    this.setState({ loadingRequests: true });

    GenericElsFetcher.getMttRequest({ id: genericEl.id })
      .then((result) => {
        // Handle different response structures
        let requestsArray = [];
        if (Array.isArray(result)) {
          requestsArray = result;
        } else if (result && Array.isArray(result.requests)) {
          requestsArray = result.requests;
        } else if (result && typeof result === 'object') {
          // If result is an object but not an array, log it for debugging
          console.log('Unexpected result structure:', result);
        }
        this.setState({ requests: requestsArray, loadingRequests: false });
      })
      .catch((error) => {
        console.error('Error fetching requests:', error);
        this.setState({ requests: [], loadingRequests: false });
      });
  }

  processWellplates() {
    const { selectedWellplates } = this.state;
    const { wellplates, genericEl } = this.props;
    const selected = wellplates.filter((wp) => selectedWellplates.includes(wp.id));
    // TODO: Implement processing logic
    const inputs = {
      id: genericEl.id,
      wellplate_ids: selectedWellplates,
    };
    GenericElsFetcher.sendMttRequest(inputs).then((result) => {
      window.open(result, '_blank');
      // Refresh requests after processing
      this.fetchRequests();
    })
      .catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  handleSelect(wellplateId, isChecked) {
    this.setState((prevState) => {
      const { selectedWellplates } = prevState;
      if (isChecked) {
        return { selectedWellplates: [...selectedWellplates, wellplateId] };
      }
      return { selectedWellplates: selectedWellplates.filter((id) => id !== wellplateId) };
    });
  }

  renderDropZone() {
    const { isOver, connectDropTarget } = this.props;
    let className = 'mb-3 dnd-zone';
    if (isOver) { className += ' dnd-zone-over'; }
    return connectDropTarget(<div className={className}>Drop Wellplate here to add.</div>);
  }

  getStateBadgeVariant(stateName) {
    switch (stateName) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'error': return 'danger';
      case 'initial': return 'secondary';
      default: return 'warning';
    }
  }

  toggleOutputs(requestId) {
    this.setState((prevState) => ({
      expandedRequestId: prevState.expandedRequestId === requestId ? null : requestId
    }));
  }

  renderOutputsTable(outputs) {
    if (!outputs || outputs.length === 0) {
      return <p className="text-muted mb-0">No outputs available.</p>;
    }

    return (
      <div className="mt-3">
        <h6 className="text-secondary mb-3">Outputs ({outputs.length})</h6>
        {outputs.map((output, idx) => (
          <div key={output.id} className="mb-4 p-3 border rounded bg-light">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h6 className="mb-0">
                <Badge bg="secondary" className="me-2">Output #{idx + 1}</Badge>
                <small className="text-muted">ID: {output.id}</small>
              </h6>
              <small className="text-muted">
                {new Date(output.created_at).toLocaleString()}
              </small>
            </div>

            {output.notes && (
              <div className="mb-2">
                <strong>Notes:</strong> {output.notes}
              </div>
            )}

            {output.output_data && output.output_data.Output && output.output_data.Output.map((dataItem, dataIdx) => (
              <div key={dataIdx} className="mt-3">
                {/* BoxPlot Visualization */}
                <div className="mb-4 p-3 bg-white border rounded">
                  <h6 className="text-primary mb-3">Dose-Response Visualization</h6>
                  <BoxPlotVisualization outputData={dataItem} />
                </div>

                {/* Results Table */}
                {dataItem.result && dataItem.result.length > 0 && (
                  <div className="mb-3">
                    <h6 className="text-primary mb-2">Results</h6>
                    <div style={{ overflowX: 'auto' }}>
                      <Table bordered size="sm" className="bg-white" style={{ fontSize: '0.85rem' }}>
                        <thead style={{ backgroundColor: '#e9ecef' }}>
                          <tr>
                            <th style={{ padding: '8px' }}>Name</th>
                            <th style={{ padding: '8px' }}>IC50 (relative)</th>
                            <th style={{ padding: '8px' }}>pIC50</th>
                            <th style={{ padding: '8px' }}>Hill Coefficient</th>
                            <th style={{ padding: '8px' }}>RSE</th>
                            <th style={{ padding: '8px' }}>p-value</th>
                            <th style={{ padding: '8px' }}>IC50 Range</th>
                            <th style={{ padding: '8px' }}>Asymptotes</th>
                            <th style={{ padding: '8px' }}>Problems</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataItem.result.map((res, resIdx) => (
                            <tr key={resIdx}>
                              <td style={{ padding: '8px', fontWeight: '500' }}>{res.name}</td>
                              <td style={{ padding: '8px' }}>{res.IC50_relative?.toFixed(4)}</td>
                              <td style={{ padding: '8px' }}>{res.pIC50?.toFixed(4)}</td>
                              <td style={{ padding: '8px' }}>{res.HillCoefficient?.toFixed(4)}</td>
                              <td style={{ padding: '8px' }}>{res.RSE?.toFixed(4)}</td>
                              <td style={{ padding: '8px', fontSize: '0.75rem' }}>{res.p_value?.toExponential(4)}</td>
                              <td style={{ padding: '8px', fontSize: '0.75rem' }}>
                                {res.IC50_relative_lower?.toFixed(2)} - {res.IC50_relative_higher?.toFixed(2)}
                              </td>
                              <td style={{ padding: '8px', fontSize: '0.75rem' }}>
                                {res.asymptote_one?.toFixed(4)} / {res.asymptote_two?.toFixed(4)}
                              </td>
                              <td style={{ padding: '8px' }}>
                                {res.Problems ? (
                                  <Badge bg="warning">{res.Problems}</Badge>
                                ) : (
                                  <span className="text-success">✓</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Input Data Summary */}
                {dataItem.input && dataItem.input.length > 0 && (
                  <div>
                    <h6 className="text-primary mb-2">Input Data Summary</h6>
                    <div style={{ overflowX: 'auto' }}>
                      <Table bordered size="sm" className="bg-white" style={{ fontSize: '0.85rem' }}>
                        <thead style={{ backgroundColor: '#e9ecef' }}>
                          <tr>
                            <th style={{ padding: '8px' }}>Name</th>
                            <th style={{ padding: '8px' }}>Concentration</th>
                            <th style={{ padding: '8px' }}>Values</th>
                            <th style={{ padding: '8px' }}>Well ID</th>
                            <th style={{ padding: '8px' }}>Sample ID</th>
                            <th style={{ padding: '8px' }}>Wellplate ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataItem.input.map((inp, inpIdx) => (
                            <tr key={inpIdx}>
                              <td style={{ padding: '8px' }}>{inp.name}</td>
                              <td style={{ padding: '8px' }}>{inp.conc}</td>
                              <td style={{ padding: '8px', fontWeight: '500' }}>{inp.values}</td>
                              <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{inp.well_id}</td>
                              <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{inp.sample_id}</td>
                              <td style={{ padding: '8px' }}>{inp.wellplate_id}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  renderRequestStatus() {
    const { requests, loadingRequests, expandedRequestId } = this.state;

    if (loadingRequests) {
      return (
        <div className="mb-4 p-4 border rounded shadow-sm bg-white">
          <h5 className="text-primary fw-bold mb-2">Request Status</h5>
          <p className="text-muted mb-0">Loading requests...</p>
        </div>
      );
    }

    if (!requests || requests.length === 0) {
      return (
        <div className="mb-4 p-4 border rounded shadow-sm bg-white">
          <h5 className="text-primary fw-bold mb-2">Request Status</h5>
          <p className="text-muted mb-0">No requests found.</p>
        </div>
      );
    }

    return (
      <div className="mb-4 p-4 border rounded shadow-sm bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0 text-primary fw-bold">Request Status</h5>
          <Button variant="outline-primary" size="sm" onClick={this.fetchRequests}>
            <i className="fa fa-refresh me-1" /> Refresh
          </Button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <Table striped bordered hover className="mb-0" style={{ fontSize: '0.9rem' }}>
            <thead style={{ backgroundColor: '#f8f9fa' }}>
              <tr>
                <th style={{ fontWeight: '600', fontSize: '0.85rem', padding: '12px' }}>Request ID</th>
                <th style={{ fontWeight: '600', fontSize: '0.85rem', padding: '12px' }}>State</th>
                <th style={{ fontWeight: '600', fontSize: '0.85rem', padding: '12px' }}>Created At</th>
                <th style={{ fontWeight: '600', fontSize: '0.85rem', padding: '12px' }}>Expires At</th>
                <th style={{ fontWeight: '600', fontSize: '0.85rem', padding: '12px' }}>Status</th>
                <th style={{ fontWeight: '600', fontSize: '0.85rem', padding: '12px', textAlign: 'center' }}>Access Count</th>
                <th style={{ fontWeight: '600', fontSize: '0.85rem', padding: '12px' }}>Message</th>
                <th style={{ fontWeight: '600', fontSize: '0.85rem', padding: '12px', textAlign: 'center' }}>Outputs</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <React.Fragment key={req.id}>
                  <tr style={{ verticalAlign: 'middle' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {req.request_id}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <Badge
                        bg={this.getStateBadgeVariant(req.state_name)}
                        style={{ fontSize: '0.75rem', padding: '0.35em 0.65em', textTransform: 'capitalize' }}
                      >
                        {req.state_name}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {new Date(req.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {new Date(req.expires_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {req.expired && (
                          <Badge bg="warning" style={{ fontSize: '0.7rem', padding: '0.3em 0.5em' }}>
                            Expired
                          </Badge>
                        )}
                        {req.revoked && (
                          <Badge bg="danger" style={{ fontSize: '0.7rem', padding: '0.3em 0.5em' }}>
                            Revoked
                          </Badge>
                        )}
                        {req.active && (
                          <Badge bg="success" style={{ fontSize: '0.7rem', padding: '0.3em 0.5em' }}>
                            Active
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px', fontSize: '0.85rem', textAlign: 'center', fontWeight: '500' }}>
                      {req.access_count}
                    </td>
                    <td style={{ padding: '10px', fontSize: '0.85rem', maxWidth: '250px' }}>
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: req.resp_message ? '#212529' : '#6c757d'
                        }}
                        title={req.resp_message || 'No message'}
                      >
                        {req.resp_message || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {req.outputs && req.outputs.length > 0 ? (
                        <Button
                          variant={expandedRequestId === req.id ? 'primary' : 'outline-primary'}
                          size="sm"
                          onClick={() => this.toggleOutputs(req.id)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {expandedRequestId === req.id ? (
                            <>
                              <i className="fa fa-chevron-up me-1" />
                              Hide ({req.outputs.length})
                            </>
                          ) : (
                            <>
                              <i className="fa fa-chevron-down me-1" />
                              Show ({req.outputs.length})
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>No outputs</span>
                      )}
                    </td>
                  </tr>
                  {expandedRequestId === req.id && req.outputs && req.outputs.length > 0 && (
                    <tr>
                      <td colSpan="8" style={{ padding: '20px', backgroundColor: '#f8f9fa' }}>
                        {this.renderOutputsTable(req.outputs)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    );
  }

  render() {
    const { wellplates, deleteWellplate } = this.props;
    const { selectedWellplates } = this.state;

    return (
      <div>
        {this.renderDropZone()}

        <Accordion className="border rounded overflow-hidden">
          {wellplates && wellplates.map((wellplate, index) => (
            <EmbeddedWellplateGenericEl
              key={`${wellplate.short_label}-${wellplate.id}`}
              wellplate={wellplate}
              wellplateIndex={index}
              deleteWellplate={deleteWellplate}
              isSelected={selectedWellplates.includes(wellplate.id)}
              onSelect={this.handleSelect}
            />
          ))}
        </Accordion>
         {selectedWellplates.length > 0 && (
          <div className="mt-3 text-end">
            <Button
              variant="primary"
              size="sm"
              onClick={this.processWellplates}
            >
              Process Selected ({selectedWellplates.length})
            </Button>
          </div>
        )}
        {this.renderRequestStatus()}
      </div>
    );
  }
}

export default DropTarget(DragDropItemTypes.WELLPLATE, target, collect)(GenericElWellplates);

GenericElWellplates.propTypes = {
  wellplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  deleteWellplate: PropTypes.func.isRequired,
  dropWellplate: PropTypes.func.isRequired,
  genericEl: PropTypes.object.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired
};

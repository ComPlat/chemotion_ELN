import React from 'react';
import PropTypes from 'prop-types';
import { Button, Table, Badge } from 'react-bootstrap';

// Helper function to determine badge color based on state
function getStateBadgeVariant(stateName) {
  switch (stateName) {
    case 'completed': return 'success';
    case 'processing': return 'info';
    case 'error': return 'danger';
    case 'initial': return 'secondary';
    default: return 'secondary';
  }
}

function MttRequestStatusTable({
  requests,
  loading,
  expandedRequestId,
  onRefresh,
  onToggleOutputs,
  onDeleteRequest,
  renderOutputsTable
}) {
  // Loading state
  if (loading) {
    return (
      <div className="mb-4 p-4 border rounded shadow-sm bg-white">
        <h5 className="text-primary fw-bold mb-2">Request Status</h5>
        <p className="text-muted mb-0">Loading requests...</p>
      </div>
    );
  }

  // Empty state
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
      {/* Header with Refresh Button */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 text-primary fw-bold">Request Status</h5>
        <Button variant="outline-primary" size="sm" onClick={onRefresh}>
          <i className="fa fa-refresh me-1" /> Refresh
        </Button>
      </div>

      {/* Requests Table */}
      <div style={{ overflowX: 'auto' }}>
        <Table striped bordered hover size="sm" className="mb-0">
          <thead className="bg-light">
            <tr>
              <th className="fw-semibold">Request ID</th>
              <th className="fw-semibold">State</th>
              <th className="fw-semibold">Created At</th>
              <th className="fw-semibold">Expires At</th>
              <th className="fw-semibold">Status</th>
              <th className="fw-semibold text-center">Access Count</th>
              <th className="fw-semibold">Message</th>
              <th className="fw-semibold text-center">Outputs</th>
              <th className="fw-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <React.Fragment key={req.id}>
                <tr className="align-middle">
                  {/* Request ID */}
                  <td className="font-monospace small">{req.request_id}</td>

                  {/* State Badge */}
                  <td>
                    <Badge
                      bg={getStateBadgeVariant(req.state_name)}
                      className="small text-capitalize"
                    >
                      {req.state_name}
                    </Badge>
                  </td>

                  {/* Created At */}
                  <td className="small text-nowrap">
                    {new Date(req.created_at).toLocaleString()}
                  </td>

                  {/* Expires At */}
                  <td className="small text-nowrap">
                    {new Date(req.expires_at).toLocaleString()}
                  </td>

                  {/* Status Badges */}
                  <td>
                    <div className="d-flex gap-1 flex-wrap">
                      {req.expired && (
                        <Badge bg="warning" className="small">Expired</Badge>
                      )}
                      {req.revoked && (
                        <Badge bg="danger" className="small">Revoked</Badge>
                      )}
                      {req.active && (
                        <Badge bg="success" className="small">Active</Badge>
                      )}
                    </div>
                  </td>

                  {/* Access Count */}
                  <td className="small text-center fw-medium">
                    {req.access_count}
                  </td>

                  {/* Message */}
                  <td className="small" style={{ maxWidth: '250px' }}>
                    <div
                      className="text-truncate"
                      style={{ color: req.resp_message ? '#212529' : '#6c757d' }}
                      title={req.resp_message || 'No message'}
                    >
                      {req.resp_message || '-'}
                    </div>
                  </td>

                  {/* Outputs Toggle Button */}
                  <td className="text-center">
                    {req.outputs && req.outputs.length > 0 ? (() => {
                      // Calculate total analyses
                      const totalAnalyses = req.outputs.reduce((sum, output) => {
                        return sum + (output.output_data?.Output?.length || 0);
                      }, 0);
                      const displayText = totalAnalyses > 0
                        ? `${totalAnalyses}`
                        : `${req.outputs.length} ${req.outputs.length === 1 ? 'output' : 'outputs'}`;

                      const isExpanded = expandedRequestId === req.id;

                      return (
                        <Button
                          variant={isExpanded ? 'primary' : 'outline-primary'}
                          size="sm"
                          onClick={() => onToggleOutputs(req.id)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {isExpanded ? (
                            <>
                              <i className="fa fa-chevron-up me-1" />
                              Hide ({displayText})
                            </>
                          ) : (
                            <>
                              <i className="fa fa-chevron-down me-1" />
                              Show ({displayText})
                            </>
                          )}
                        </Button>
                      );
                    })() : (
                      <span className="text-muted small">No outputs</span>
                    )}
                  </td>

                  {/* Delete Button */}
                  <td className="text-center">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => onDeleteRequest(req.id)}
                      style={{ fontSize: '0.75rem' }}
                      title="Delete request"
                    >
                      <i className="fa fa-trash" />
                    </Button>
                  </td>
                </tr>

                {/* Expanded Outputs Row */}
                {expandedRequestId === req.id && req.outputs && req.outputs.length > 0 && (
                  <tr>
                    <td colSpan="9" className="p-1 bg-light">
                      {renderOutputsTable(req.outputs)}
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

MttRequestStatusTable.propTypes = {
  requests: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    request_id: PropTypes.string.isRequired,
    state_name: PropTypes.string.isRequired,
    created_at: PropTypes.string.isRequired,
    expires_at: PropTypes.string.isRequired,
    expired: PropTypes.bool,
    revoked: PropTypes.bool,
    active: PropTypes.bool,
    access_count: PropTypes.number,
    resp_message: PropTypes.string,
    outputs: PropTypes.array
  })).isRequired,
  loading: PropTypes.bool.isRequired,
  expandedRequestId: PropTypes.number,
  onRefresh: PropTypes.func.isRequired,
  onToggleOutputs: PropTypes.func.isRequired,
  onDeleteRequest: PropTypes.func.isRequired,
  renderOutputsTable: PropTypes.func.isRequired
};

MttRequestStatusTable.defaultProps = {
  expandedRequestId: null
};

export default MttRequestStatusTable;

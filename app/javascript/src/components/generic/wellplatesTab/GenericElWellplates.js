import React, { Component } from 'react';
import { Accordion, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import EmbeddedWellplateGenericEl from 'src/components/generic/wellplatesTab/EmbeddedWellplateGenericEl';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import ConfirmModal from 'src/components/common/ConfirmModal';
import MttAnalysisDetailsModal from 'src/components/generic/wellplatesTab/MttAnalysisDetailsModal';
import MttResultsTable from 'src/components/generic/wellplatesTab/MttResultsTable';
import MttRequestStatusTable from 'src/components/generic/wellplatesTab/MttRequestStatusTable';
import { flattenAnalysesFromOutputs } from 'src/utilities/mttDataProcessor';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

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
      selectedAnalyses: {},
      showDetailsModal: false,
      selectedAnalysisForModal: null,
      showDeleteConfirmation: false,
      deleteType: null,
      deleteId: null,
      deleteSampleName: null,
      sendingToSample: false,
    };
    this.handleSelect = this.handleSelect.bind(this);
    this.processWellplates = this.processWellplates.bind(this);
    this.fetchRequests = this.fetchRequests.bind(this);
    this.toggleOutputs = this.toggleOutputs.bind(this);
    this.toggleAnalysisSelection = this.toggleAnalysisSelection.bind(this);
    this.handleShowDetails = this.handleShowDetails.bind(this);
    this.handleCloseDetailsModal = this.handleCloseDetailsModal.bind(this);
    this.handleDeleteRequest = this.handleDeleteRequest.bind(this);
    this.handleDeleteOutput = this.handleDeleteOutput.bind(this);
    this.handleDeleteAnalysis = this.handleDeleteAnalysis.bind(this);
    this.onConfirmDelete = this.onConfirmDelete.bind(this);
    this.toggleSelectAll = this.toggleSelectAll.bind(this);
    this.handleBatchSendToSample = this.handleBatchSendToSample.bind(this);
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
          // If result is an object but not an array, treat as empty
        }

        // Filter requests by element_id to show only requests for this element
        const filteredRequests = requestsArray.filter(
          (req) => req.element_id === genericEl.id
        );
        this.setState({ requests: filteredRequests, loadingRequests: false });
      })
      .catch((error) => {
        console.error('Error fetching requests:', error);
        this.setState({ requests: [], loadingRequests: false });
      });
  }

  processWellplates() {
    const { selectedWellplates } = this.state;
    const { genericEl } = this.props;
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

  toggleOutputs(requestId) {
    this.setState((prevState) => ({
      expandedRequestId: prevState.expandedRequestId === requestId ? null : requestId
    }));
  }

  toggleAnalysisSelection(key) {
    this.setState((prevState) => ({
      selectedAnalyses: {
        ...prevState.selectedAnalyses,
        [key]: !prevState.selectedAnalyses[key]
      }
    }));
  }

  toggleSelectAll(allKeys) {
    this.setState((prevState) => {
      const { selectedAnalyses } = prevState;
      // Check if all are currently selected
      const allSelected = allKeys.every(key => selectedAnalyses[key]);

      // If all selected, deselect all. Otherwise, select all.
      const newSelection = {};
      allKeys.forEach(key => {
        newSelection[key] = !allSelected;
      });

      return { selectedAnalyses: newSelection };
    });
  }

  handleShowDetails(dataItem, sampleName, outputId) {
    this.setState({
      showDetailsModal: true,
      selectedAnalysisForModal: { dataItem, sampleName, outputId }
    });
  }

  handleCloseDetailsModal() {
    this.setState({
      showDetailsModal: false,
      selectedAnalysisForModal: null
    });
  }

  handleDeleteAnalysis(outputId, sampleName) {
    this.setState({
      showDeleteConfirmation: true,
      deleteType: 'result',
      deleteId: outputId,
      deleteSampleName: sampleName,
    });
  }

  handleBatchSendToSample(selectedItems) {
    if (selectedItems.length === 0) {
      NotificationActions.add({
        title: 'No Selection',
        message: 'Please select at least one analysis to send to samples.',
        level: 'warning',
        position: 'tr',
        autoDismiss: 3
      });
      return;
    }

    const { genericEl } = this.props;

    // Prepare selections array with output_id, sample_name, and result_data
    const selections = selectedItems.map(item => ({
      output_id: item.outputId,
      sample_name: item.sampleName,
      result_data: item.dataItem.result[0]
    }));

    this.setState({ sendingToSample: true });

    const assayInfo = {
      element_klass_label: genericEl.element_klass?.label || '',
      element_short_label: genericEl.short_label || '',
      element_name: genericEl.name || '',
    };

    GenericElsFetcher.sendMttResultsToSample(selections, genericEl.id, assayInfo)
      .then((result) => {
        // bulk_create_from_raw_data returns { measurements: [{id, errors, ...}, ...] }
        const entries = result && result.measurements ? result.measurements : [];
        const created = entries.filter(e => e.id && (!e.errors || e.errors.length === 0));
        const failed = entries.filter(e => e.errors && e.errors.length > 0);

        if (created.length > 0 && failed.length === 0) {
          this.setState({
            sendingToSample: false,
            selectedAnalyses: {}
          });
          NotificationActions.add({
            title: 'Measurements Created',
            message: `Successfully created ${created.length} measurement${created.length > 1 ? 's' : ''}. Check the Measurements tab to view results.`,
            level: 'success',
            position: 'tr',
            autoDismiss: 7
          });
        } else if (created.length > 0 && failed.length > 0) {
          this.setState({ sendingToSample: false, selectedAnalyses: {} });
          NotificationActions.add({
            title: 'Partial Success',
            message: `Created ${created.length} measurement(s), but ${failed.length} failed.`,
            level: 'warning',
            position: 'tr',
            autoDismiss: 8
          });
        } else {
          this.setState({ sendingToSample: false });
          const errorMsg = failed.length > 0 && failed[0].errors
            ? failed[0].errors[0]
            : 'Unknown error';
          NotificationActions.add({
            title: 'Error',
            message: `Failed to create measurements. ${errorMsg}`,
            level: 'error',
            position: 'tr',
            autoDismiss: 8
          });
        }
      })
      .catch((error) => {
        console.error('Error sending to sample:', error);
        this.setState({ sendingToSample: false });
        NotificationActions.add({
          title: 'Request Failed',
          message: 'Failed to send results to samples. Please try again.',
          level: 'error',
          position: 'tr',
          autoDismiss: 5
        });
      });
  }

  toggleDataItemExpansion(key) {
    this.setState((prevState) => {
      const { expandedDataItems } = prevState;
      return {
        expandedDataItems: {
          ...expandedDataItems,
          [key]: !expandedDataItems[key]
        }
      };
    });
  }

  toggleInputSummary(key) {
    this.setState((prevState) => {
      const { expandedInputSummaries } = prevState;
      return {
        expandedInputSummaries: {
          ...expandedInputSummaries,
          [key]: !expandedInputSummaries[key]
        }
      };
    });
  }

  handleDeleteRequest(requestId) {
    this.setState({
      showDeleteConfirmation: true,
      deleteType: 'request',
      deleteId: requestId,
    });
  }

  handleDeleteOutput(outputId) {
    this.setState({
      showDeleteConfirmation: true,
      deleteType: 'output',
      deleteId: outputId,
    });
  }

  onConfirmDelete(confirmed) {
    if (!confirmed) {
      this.setState({
        showDeleteConfirmation: false,
        deleteType: null,
        deleteId: null,
        deleteSampleName: null,
      });
      return;
    }

    const { deleteType, deleteId, deleteSampleName } = this.state;

    if (deleteType === 'request') {
      GenericElsFetcher.deleteMttRequests([deleteId])
        .then((result) => {
          if (result && result.success) {
            this.fetchRequests();
          }
        })
        .catch((error) => {
          console.error('Error deleting request:', error);
        })
        .finally(() => {
          this.setState({
            showDeleteConfirmation: false,
            deleteType: null,
            deleteId: null,
          });
        });
    } else if (deleteType === 'output') {
      GenericElsFetcher.deleteMttOutputs([deleteId])
        .then((result) => {
          if (result && result.success) {
            this.fetchRequests();
          }
        })
        .catch((error) => {
          console.error('Error deleting output:', error);
        })
        .finally(() => {
          this.setState({
            showDeleteConfirmation: false,
            deleteType: null,
            deleteId: null,
          });
        });
    } else if (deleteType === 'result') {
      // TODO: BACKEND - Endpoint needs to be implemented
      // For now, this will fail gracefully until backend is ready
      GenericElsFetcher.deleteMttResult(deleteId, deleteSampleName)
        .then((result) => {
          if (result && result.success) {
            this.fetchRequests();
          }
        })
        .catch((error) => {
          console.error('Error deleting result:', error);
          alert('Delete individual result endpoint not yet implemented.');
        })
        .finally(() => {
          // Close modal if deleting from modal (happens regardless of success/failure)
          if (this.state.showDetailsModal) {
            this.handleCloseDetailsModal();
          }

          this.setState({
            showDeleteConfirmation: false,
            deleteType: null,
            deleteId: null,
            deleteSampleName: null,
          });
        });
    }
  }

  renderOutputsTable(outputs) {
    const { selectedAnalyses, sendingToSample } = this.state;

    // Use utility function to flatten analyses
    const allAnalyses = flattenAnalysesFromOutputs(outputs);

    if (allAnalyses.length === 0) {
      return <p className="text-muted mb-0">No outputs available.</p>;
    }

    // Get selected items
    const selectedItems = allAnalyses.filter(item => selectedAnalyses[item.key]);
    const selectedCount = selectedItems.length;

    return (
      <div className="mt-1">
        {/* Selection Toolbar */}
        {selectedCount > 0 && (
          <div className="mb-3 p-3 bg-light border rounded d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <i className="fa fa-check-square-o text-primary" style={{ fontSize: '1.2rem' }} />
              <span className="fw-semibold">
                <span className="badge bg-primary me-2">{selectedCount}</span>
                {selectedCount === 1 ? 'analysis' : 'analyses'} selected
              </span>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => this.handleBatchSendToSample(selectedItems)}
                disabled={sendingToSample}
              >
                {sendingToSample ? (
                  <>
                    <i className="fa fa-spinner fa-spin me-1" />
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="fa fa-paper-plane me-1" />
                    Send to Sample
                  </>
                )}
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => this.setState({ selectedAnalyses: {} })}
                title="Clear selection"
              >
                <i className="fa fa-times me-1" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="mb-3">
          <h6 className="text-primary mb-0">
            <i className="fa fa-flask me-2" />
            Analysis Results ({allAnalyses.length})
          </h6>
        </div>

        {/* Results Table Component */}
        <MttResultsTable
          analyses={allAnalyses}
          selectedAnalyses={selectedAnalyses}
          onToggleSelection={this.toggleAnalysisSelection}
          onToggleSelectAll={this.toggleSelectAll}
          onShowDetails={this.handleShowDetails}
          onDelete={this.handleDeleteAnalysis}
        />
      </div>
    );
  }

  renderRequestStatus() {
    const { requests, loadingRequests, expandedRequestId } = this.state;

    return (
      <MttRequestStatusTable
        requests={requests}
        loading={loadingRequests}
        expandedRequestId={expandedRequestId}
        onRefresh={this.fetchRequests}
        onToggleOutputs={this.toggleOutputs}
        onDeleteRequest={this.handleDeleteRequest}
        renderOutputsTable={(outputs) => this.renderOutputsTable(outputs)}
      />
    );
  }

  render() {
    const { wellplates, deleteWellplate } = this.props;
    const { selectedWellplates } = this.state;

    return (
      <div>
        {this.renderDropZone()}

        <Accordion className="mb-3 border rounded overflow-hidden">
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
          <div className="mb-3 text-end">
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

        <ConfirmModal
          showModal={this.state.showDeleteConfirmation}
          title="Are you sure?"
          content={(
            <p>
              Deletion of this {this.state.deleteType} cannot be undone. Please check carefully.
            </p>
          )}
          onClick={this.onConfirmDelete}
        />

        <MttAnalysisDetailsModal
          show={this.state.showDetailsModal}
          onHide={this.handleCloseDetailsModal}
          analysisData={this.state.selectedAnalysisForModal}
          onDelete={this.handleDeleteAnalysis}
        />
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

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
      selectedAnalyses: {}, // Track selected checkboxes by key
      showDetailsModal: false,
      selectedAnalysisForModal: null, // Store { dataItem, sampleName, outputId }
      showDeleteConfirmation: false,
      deleteType: null, // 'request' or 'output' or 'result'
      deleteId: null,
      deleteSampleName: null, // Store sample name for result deletion
      sendingToSample: false, // Track if batch send is in progress
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
        console.log("Result item: ",{ id: genericEl.id },result);
        
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

        // Filter requests by element_id to show only requests for this element
        const filteredRequests = requestsArray.filter(
          (req) => req.element_id === genericEl.id
        );
        console.log("Request Results filteredRequests: ", filteredRequests);


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
    // Get output IDs from selected items
    const outputIds = [...new Set(selectedItems.map(item => item.outputId))];

    if (outputIds.length === 0) {
      alert('No analyses selected');
      return;
    }

    this.setState({ sendingToSample: true });

    // TODO: BACKEND - Endpoint needs to be implemented
    // For now, this will fail gracefully until backend is ready
    GenericElsFetcher.sendMttResultsToSample({ output_ids: outputIds })
      .then((result) => {
        if (result && result.success) {
          this.setState({
            sendingToSample: false,
            selectedAnalyses: {} // Clear selections after successful send
          });
          alert(`Successfully sent ${selectedItems.length} analysis results to samples`);
          this.fetchRequests(); // Refresh data
        }
      })
      .catch((error) => {
        console.error('Error sending to sample:', error);
        this.setState({ sendingToSample: false });
        alert('Send to sample endpoint not yet implemented. Please ask backend team to implement: POST /api/v1/mtt/send_to_sample');
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
            // Close modal if deleting from modal
            if (this.state.showDetailsModal) {
              this.handleCloseDetailsModal();
            }
          }
        })
        .catch((error) => {
          console.error('Error deleting result:', error);
          alert('Delete individual result endpoint not yet implemented. Please ask backend team to implement: DELETE /api/v1/mtt/outputs/:id/results');
        })
        .finally(() => {
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
      <div className="mt-3">
        {/* Selection Toolbar */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="text-secondary mb-0">
            Results ({allAnalyses.length})
          </h6>
          {selectedCount > 0 && (
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                {selectedCount} selected
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => this.handleBatchSendToSample(selectedItems)}
                disabled={sendingToSample}
                style={{ fontSize: '0.75rem' }}
              >
                <i className="fa fa-paper-plane me-1" />
                {sendingToSample ? 'Sending...' : 'Send to Sample'}
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => this.setState({ selectedAnalyses: {} })}
                style={{ fontSize: '0.75rem' }}
                title="Clear selection"
              >
                <i className="fa fa-times" />
              </Button>
            </div>
          )}
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

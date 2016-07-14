import React from 'react';
import {Button, ButtonToolbar, DropdownButton, FormControl,
  FormGroup, ControlLabel, Modal, MenuItem, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';
import ElementActions from '../actions/ElementActions';
import ClipboardActions from '../actions/ClipboardActions';
import SamplesFetcher from '../fetchers/SamplesFetcher';

export default class CreateButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      samples: [],
      collectionId: null,
      modalProps: {
        show: false,
        sampleCount: 0,
        wellplateCount: 0
      }
    }
  }

  getSampleFilter() {
    let uiState = UIStore.getState();
    return this.filterParamsFromUIStateByElementType(uiState, "sample");
  }

  getReactionId() {
    let uiState = UIStore.getState();
    return uiState.reaction.checkedIds.first();
  }

  isCopySampleDisabled() {
    let sampleFilter = this.getSampleFilter();
    return !sampleFilter.all && sampleFilter.included_ids.size == 0;
  }

  copySample() {
    let sampleFilter = this.getSampleFilter();

    // Set limit to 1 because we are only interested in one sample
    let params = {
      sample: sampleFilter,
      limit: 1
    }

    ClipboardActions.fetchSamplesByUIStateAndLimit(params, 'copy_sample');
  }

  isCopyReactionDisabled() {
    let reactionId = this.getReactionId();
    return !reactionId;
  }

  copyReaction() {
    let reactionId = this.getReactionId();
    ElementActions.copyReactionFromId(reactionId);
  }

  createWellplateFromSamples() {
    let uiState = UIStore.getState();
    let sampleFilter = this.filterParamsFromUIStateByElementType(uiState, "sample");

    let params = {
      sample: sampleFilter
    }

    SamplesFetcher.fetchByUIState(params).then((result) => {
      const samples = result;
      const sampleCount = samples.length;

      if(sampleCount <= 96) {
        ClipboardActions.fetchSamplesByUIStateAndLimit(params, 'template_wellplate');
      } else {
        const wellplateCount = Math.ceil(sampleCount / 96);

        this.setState({
          samples: samples,
          collectionId: sampleFilter.collection_id,
          modalProps: {
            show: true,
            sampleCount: sampleCount,
            wellplateCount: wellplateCount
          }
        });
      }
    });
  }

  handleModalHide() {
    this.setState({
      modalProps: {
        show: false
      }
    });
    // https://github.com/react-bootstrap/react-bootstrap/issues/1137
    document.body.className = document.body.className.replace('modal-open', '');
  }

  bulkCreateWellplates() {
    const wellplateCount = this.refs.wellplateInput.getValue();
    const { collectionId, samples } = this.state;

    ElementActions.bulkCreateWellplatesFromSamples({
      collection_id: collectionId,
      samples: samples,
      wellplateCount: wellplateCount
    });
    this.handleModalHide();
  }

  createWellplateModal() {
    const { modalProps } = this.state;

    return (
      <Modal animation={false} show={modalProps.show} onHide={() => this.handleModalHide()}>
        <Modal.Header closeButton>
          <Modal.Title>Create Wellplates from Samples</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You have selected {modalProps.sampleCount} samples. Please fill in the number of wellplates you would like to create.
          <p />
          <FormGroup controlId="wellplateInput">
            <ControlLabel>Number of wellplates</ControlLabel>
            <FormControl type="text"
              ref="wellplateInput"
              defaultValue={modalProps.wellplateCount}/>
          </FormGroup>

          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => this.handleModalHide()}>Cancel</Button>
            <Button bsStyle="warning" onClick={() => this.bulkCreateWellplates()}>Submit</Button>
          </ButtonToolbar>
        </Modal.Body>
      </Modal>
    )
  }

  createScreenFromWellplates() {
    let uiState = UIStore.getState();
    let wellplateFilter = this.filterParamsFromUIStateByElementType(uiState, "wellplate");
    let params = {
      wellplate: wellplateFilter
    }
    ClipboardActions.fetchWellplatesByUIState(params, 'template_screen');
  }

  filterParamsFromUIStateByElementType(uiState, elementType) {
    let collectionId = uiState.currentCollection && uiState.currentCollection.id;

    return {
      all: uiState[elementType].checkedAll,
      included_ids: uiState[elementType].checkedIds,
      excluded_ids: uiState[elementType].uncheckedIds,
      collection_id: collectionId
    }
  }

  _splitSelectionAsSubsamples() {
    ElementActions.splitAsSubsamples(UIStore.getState())
  }

  createElementOfType(type) {
    const {currentCollection} = UIStore.getState();
    Aviator.navigate(`/collection/${currentCollection.id}/${type}/new`);
  }

  render() {
    const {isDisabled} = this.props;
    const title = <i className="fa fa-plus"></i>;
    const tooltip = (
      <Tooltip id="create_button">Create new Element</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <DropdownButton id='crate-button-dropdown' bsStyle="primary" title={title} disabled={isDisabled}>
          {this.createWellplateModal()}
          <MenuItem onSelect={() => this.createElementOfType('sample')}>Create Sample</MenuItem>
          <MenuItem onSelect={() => this.createElementOfType('reaction')}>Create Reaction</MenuItem>
          <MenuItem onSelect={() => this.createElementOfType('wellplate')}>Create Wellplate</MenuItem>
          <MenuItem onSelect={() => this.createElementOfType('screen')}>Create Screen</MenuItem>
          <MenuItem divider />
          <MenuItem onSelect={() => this.createWellplateFromSamples()}>Create Wellplate from Samples</MenuItem>
          <MenuItem onSelect={() => this.createScreenFromWellplates()}>Create Screen from Wellplates</MenuItem>
          <MenuItem divider />
          <MenuItem onSelect={() => this.copySample()} disabled={this.isCopySampleDisabled()}>Copy Sample</MenuItem>
          <MenuItem onSelect={() => this.copyReaction()} disabled={this.isCopyReactionDisabled()}>Copy Reaction</MenuItem>
        </DropdownButton>
      </OverlayTrigger>
    )
  }
}

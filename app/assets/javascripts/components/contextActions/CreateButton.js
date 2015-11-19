import React from 'react';
import {DropdownButton, MenuItem, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';
import ElementStore from '../stores/ElementStore';
import ElementActions from '../actions/ElementActions';
import ClipboardActions from '../actions/ClipboardActions';

export default class CreateButton extends React.Component {
  copySample() {
    let uiState = UIStore.getState();
    let sampleFilter = this.filterParamsFromUIStateByElementType(uiState, "sample");

    // Set limit to 1 because we are only interested in one sample
    let params = {
      sample: sampleFilter,
      limit: 1
    }

    ClipboardActions.fetchSamplesByUIStateAndLimit(params, 'copy_sample');
  }

  copyReaction() {
    const uiState = UIStore.getState();
    const elementState = ElementStore.getState();
    const reactionId = uiState.reaction.checkedIds.first();
    ElementActions.copyReactionFromId(reactionId);
  }

  createWellplateFromSamples() {
    let uiState = UIStore.getState();
    let sampleFilter = this.filterParamsFromUIStateByElementType(uiState, "sample");

    let params = {
      sample: sampleFilter,
      limit: 96
    }

    ClipboardActions.fetchSamplesByUIStateAndLimit(params, 'template_wellplate');
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
      <Tooltip>Create new Element</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <DropdownButton bsStyle="primary" title={title} disabled={isDisabled}>
          <MenuItem onSelect={() => this.createElementOfType('sample')}>Create Sample</MenuItem>
          <MenuItem onSelect={() => this.createElementOfType('reaction')}>Create Reaction</MenuItem>
          <MenuItem onSelect={() => this.createElementOfType('wellplate')}>Create Wellplate</MenuItem>
          <MenuItem onSelect={() => this.createElementOfType('screen')}>Create Screen</MenuItem>
          <MenuItem divider />
          <MenuItem onSelect={() => this.createWellplateFromSamples()}>Create Wellplate from Samples</MenuItem>
          <MenuItem onSelect={() => this.createScreenFromWellplates()}>Create Screen from Wellplates</MenuItem>
          <MenuItem divider />
          <MenuItem onSelect={() => this.copySample()}>Copy Sample</MenuItem>
          <MenuItem onSelect={() => this.copyReaction()}>Copy Reaction</MenuItem>
        </DropdownButton>
      </OverlayTrigger>
    )
  }
}

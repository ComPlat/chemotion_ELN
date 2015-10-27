import React from 'react';
import {DropdownButton, MenuItem, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';
import ClipboardActions from '../actions/ClipboardActions';

export default class TemplateButton extends React.Component {
  createWellplateFromSamples() {
    let uiState = UIStore.getState();
    let sampleFilter = this.filterSampleParamsFromUIState(uiState);
    let currentCollection = uiState.currentCollection;

    let params = {
      sample: sampleFilter,
      limit: 96
    }

    ClipboardActions.fetchSamplesByUIStateAndLimit(params);

    Aviator.navigate(`/collection/${currentCollection.id}/wellplate/new`);
  }

  filterSampleParamsFromUIState(uiState) {
    let collectionId = uiState.currentCollection && uiState.currentCollection.id;

    return {
      all: uiState.sample.checkedAll,
      included_ids: uiState.sample.checkedIds,
      excluded_ids: uiState.sample.uncheckedIds,
      collection_id: collectionId
    }
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
          <MenuItem onClick={() => this.createWellplateFromSamples()}>Create Wellplate from Samples</MenuItem>
        </DropdownButton>
      </OverlayTrigger>

    )
  }
}

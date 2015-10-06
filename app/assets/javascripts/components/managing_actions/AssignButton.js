import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);
  }

  showAssignModal() {
    Aviator.navigate('/assign');
  }

  isDisabled() {
    let uiState = UIStore.getState();
    let currentCollectionId = uiState.currentCollectionId;
    let currentCollectionIsShared = this.currentCollectionIsShared(currentCollectionId);

    return currentCollectionId == 'all' || currentCollectionIsShared;
  }

  // TODO extract in Collection class?
  currentCollectionIsShared(currentCollectionId) {
    let collectionState = CollectionStore.getState();
    let currentCollection = this.findCollectionById(collectionState.unsharedRoots, currentCollectionId) || this.findCollectionById(collectionState.sharedRoots, currentCollectionId) || this.findCollectionById(collectionState.remoteRoots, currentCollectionId)

    return currentCollection ? currentCollection.is_shared == true : false;
  }

  findCollectionById(roots, id) {
    let foundCollection = roots.filter((root) => {
      return root.id == id;
    });

    return foundCollection.length == 0 ? null : foundCollection.pop();
  }

  render() {
    const tooltip = (
      <Tooltip>Assign a Collection to the selected elements</Tooltip>
    );
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <Button bsStyle="success" onClick={this.showAssignModal.bind(this)} disabled={this.isDisabled()}>
          <i className="fa fa-plus"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}

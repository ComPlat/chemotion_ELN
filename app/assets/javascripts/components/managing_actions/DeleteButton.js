import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import ElementActions from '../actions/ElementActions';
import UIStore from '../stores/UIStore';

export default class DeleteButton extends React.Component {
  constructor(props) {
    super(props);
  }

  _deleteSelection() {
    const uiState = UIStore.getState();
    ElementActions.deleteElements(uiState);
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  render() {
    const tooltip = (
      <Tooltip>Delete from system the selected elements</Tooltip>
    );
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <Button bsStyle="danger" onClick={e => this._deleteSelection()}>
          <i className="fa fa-trash"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}
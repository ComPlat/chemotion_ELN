import React from 'react';
import {Button} from 'react-bootstrap';
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
    return (
      <Button onClick={e => this._deleteSelection()}>Delete Elements</Button>
    )
  }
}
import React from 'react';
import {Button} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';

export default class RemoveButton extends React.Component {
  constructor(props) {
    super(props);
  }

  showRemoveModal() {
    Aviator.navigate('/remove');
  }

  isAllCollection() {
    let uiState = UIStore.getState();
    return uiState.currentCollectionId == 'all'
  }

  render() {
    return (
      <Button onClick={this.showRemoveModal.bind(this)} disabled={this.isAllCollection()}>
        Remove from Collection
      </Button>
    )
  }
}

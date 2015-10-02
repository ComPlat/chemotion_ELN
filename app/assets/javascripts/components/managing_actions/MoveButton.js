import React from 'react';
import {Button} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);
  }

  showMoveModal() {
    Aviator.navigate('/move');
  }

  isAllCollection() {
    let uiState = UIStore.getState();
    return uiState.currentCollectionId == 'all'
  }

  render() {
    return (
      <Button onClick={this.showMoveModal.bind(this)} disabled={this.isAllCollection()}>
        Move to Collection
      </Button>
    )
  }
}

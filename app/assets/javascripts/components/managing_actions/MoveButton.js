import React from 'react';
import {Button} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);
  }

  showMoveModal() {
    let uiState = UIStore.getState();
    Aviator.navigate('/move');
  }

  render() {
    return (
      <Button block onClick={this.showMoveModal.bind(this)}>Move Selection</Button>
    )
  }
}

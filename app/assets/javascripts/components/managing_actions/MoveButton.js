import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';

export default class ShareButton extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isDisabled: props.isDisabled
    }
  }

  showMoveModal() {
    Aviator.navigate('/move');
  }

  render() {
    const tooltip = (
      <Tooltip>Move the selected elements from this Collection to another Collection</Tooltip>
    );
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <Button bsStyle="primary" onClick={this.showMoveModal.bind(this)} disabled={this.state.isDisabled}>
          <i className="fa fa-arrow-right"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}

import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';

export default class RemoveButton extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isDisabled: props.isDisabled
    }
  }

  showRemoveModal() {
    Aviator.navigate('/remove');
  }

  render() {
    const tooltip = (
      <Tooltip>Remove from this Collection the selected elements</Tooltip>
    );
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <Button bsStyle="warning" onClick={this.showRemoveModal.bind(this)} disabled={this.state.isDisabled}>
          <i className="fa fa-minus"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}
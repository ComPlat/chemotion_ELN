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

  showAssignModal() {
    Aviator.navigate('/assign');
  }

  render() {
    const tooltip = (
      <Tooltip>Assign a Collection to the selected elements</Tooltip>
    );
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <Button bsStyle="success" onClick={this.showAssignModal.bind(this)} disabled={this.state.isDisabled}>
          <i className="fa fa-plus"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}

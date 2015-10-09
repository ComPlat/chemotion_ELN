import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';

export default class AssignButton extends React.Component {
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
    const {isDisabled} = this.props;
    const tooltip = (
      <Tooltip>Assign to Collection</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button bsStyle="success" onClick={this.showAssignModal.bind(this)} disabled={isDisabled}>
          <i className="fa fa-plus-square"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}

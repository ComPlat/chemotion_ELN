import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';

export default class RemoveButton extends React.Component {
  showRemoveModal() {
    Aviator.navigate('/remove');
  }

  render() {
    const {isDisabled} = this.props;
    const tooltip = (
      <Tooltip>Remove from Collection</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button bsStyle="warning" onClick={this.showRemoveModal.bind(this)} disabled={isDisabled}>
          <i className="fa fa-minus-square"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}
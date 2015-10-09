import React from 'react';
import {DropdownButton, MenuItem, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from 'components/stores/UIStore';
import ElementActions from 'components/actions/ElementActions';

export default class CreateButton extends React.Component {
  _splitSelectionAsSubsamples() {
    ElementActions.splitAsSubsamples(UIStore.getState())
  }

  createElementOfType(type) {
    const {currentCollection} = UIStore.getState();
    Aviator.navigate(`/collection/${currentCollection.id}/${type}/new`);
  }

  render() {
    const {isDisabled} = this.props;
    const title = <i className="fa fa-plus"></i>;
    const tooltip = (
      <Tooltip>Create new Element</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <DropdownButton bsStyle="primary" title={title} disabled={isDisabled}>
          <MenuItem onClick={() => this.createElementOfType('sample')}>Create Sample</MenuItem>
          <MenuItem onClick={() => this.createElementOfType('reaction')}>Create Reaction</MenuItem>
          <MenuItem onClick={() => this.createElementOfType('wellplate')}>Create Wellplate</MenuItem>
          <MenuItem onClick={() => this.createElementOfType('screen')}>Create Screen</MenuItem>
        </DropdownButton>
      </OverlayTrigger>

    )
  }
}

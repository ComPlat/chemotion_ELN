import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from 'components/stores/UIStore';
import ElementActions from 'components/actions/ElementActions';

export default class SplitButton extends React.Component {
  _splitSelectionAsSubsamples() {
    ElementActions.splitAsSubsamples(UIStore.getState())
  }

  render() {
    const {isDisabled} = this.props;
    const tooltip = (
      <Tooltip id="split_button">Split Sample</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button onClick={e => this._splitSelectionAsSubsamples()} disabled={isDisabled}>
          <i className="fa fa-clone"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}

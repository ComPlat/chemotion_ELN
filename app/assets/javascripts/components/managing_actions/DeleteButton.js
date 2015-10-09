import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import ElementActions from '../actions/ElementActions';
import UIStore from '../stores/UIStore';

export default class DeleteButton extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isDisabled: props.isDisabled
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      isDisabled: nextProps.isDisabled
    })
  }
  
  _deleteSelection() {
    const uiState = UIStore.getState();
    ElementActions.deleteElements(uiState);
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  render() {
    const {isDisabled} = this.props;
    const tooltip = (
      <Tooltip>Delete from all Collections</Tooltip>
    );
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Button bsStyle="danger" onClick={e => this._deleteSelection()} disabled={isDisabled}>
          <i className="fa fa-trash"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}

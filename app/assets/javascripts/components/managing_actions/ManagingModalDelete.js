import React from 'react';
import {Button, ButtonToolbar} from 'react-bootstrap';

export default class ManagingModalDelete extends React.Component {
  handleClick() {
    const {onHide, action} = this.props;
    action();
    onHide();
  }

  render() {
    const {onHide} = this.props;
    return (
      <ButtonToolbar>
        <Button bsStyle="primary" onClick={() => onHide()}>Cancel</Button>
        <Button bsStyle="warning" onClick={() => this.handleClick()}>Delete</Button>
      </ButtonToolbar>
    )
  }
}

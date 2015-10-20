import React from 'react';
import {Modal} from 'react-bootstrap';

export default class ManagingModal extends React.Component {
  render() {
    const {show, Component, title, onHide, action} = this.props;
    if(show) {
      return (
        <Modal animation={false} show={show} onHide={() => onHide()}>
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Component
              onHide={() => onHide()}
              action={action}
              />
          </Modal.Body>
        </Modal>
      )
    } else {
      return <div></div>
    }
  }
}

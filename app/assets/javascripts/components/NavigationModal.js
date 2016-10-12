import React from 'react';
import {Modal} from 'react-bootstrap';

const NavigationModal = ({show, title, Component, action, onHide, listSharedCollections}) => {
  return(
    show
      ? <Modal animation={false} show={show} onHide={() => onHide()}>
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Component onHide={() => onHide()}
                        action={action}
                        listSharedCollections={listSharedCollections} />
          </Modal.Body>
        </Modal>
      : <div></div>
  )
}

export default NavigationModal

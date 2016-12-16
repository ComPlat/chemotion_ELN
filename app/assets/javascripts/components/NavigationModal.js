import React from 'react';
import {Modal} from 'react-bootstrap';
import UIActions from './actions/UIActions'

const NavigationModal = ({show, title, component, customModal, ...props}) => {
  const Component = component
  return(
    show
      ? <Modal  dialogClassName={customModal} animation={false} show={show} onHide={() => UIActions.hideModal()}>
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Component onHide={() => UIActions.hideModal()} {...props} />
          </Modal.Body>
        </Modal>
      : <div></div>
  )
}

export default NavigationModal

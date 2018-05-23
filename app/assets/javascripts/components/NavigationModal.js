import React from 'react';
import { Modal } from 'react-bootstrap';
import UIActions from './actions/UIActions';

function NavigationModal({
  show, title, component, customModal, ...props
}) {
  const Component = component;
  if (!show) return (<span />);

  return (
    <Modal
      dialogClassName={customModal}
      animation={false}
      show={show}
      onHide={() => UIActions.hideModal()}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Component onHide={() => UIActions.hideModal()} {...props} />
      </Modal.Body>
    </Modal>
  );
}

NavigationModal.propTypes = {
  show: React.PropTypes.bool,
  customModal: React.PropTypes.string,
  component: React.PropTypes.func,
  title: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.element
  ]),
};

NavigationModal.defaultProps = {
  show: false,
  customModal: '',
  component: null,
  title: '',
};

export default NavigationModal;

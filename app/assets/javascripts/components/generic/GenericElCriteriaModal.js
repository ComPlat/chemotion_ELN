import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';

function GenericElCriteriaModal(props) {
  const Component = props.component;
  if (!props.show) return (<span />);
  return (
    <Modal
      dialogClassName="generic_criteria_modal"
      animation={false}
      show={props.show}
      onHide={props.onHide}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {props.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {Component}
      </Modal.Body>
    </Modal>
  );
}

GenericElCriteriaModal.propTypes = {
  show: PropTypes.bool,
  component: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.element
  ]),
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.element
  ]),
  onHide: PropTypes.func,
};

GenericElCriteriaModal.defaultProps = {
  show: false,
  component: null,
  title: '',
  onHide: () => {}
};

export default GenericElCriteriaModal;

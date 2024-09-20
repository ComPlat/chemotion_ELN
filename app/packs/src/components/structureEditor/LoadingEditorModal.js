import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';

const LoadingEditorModal = (props) => {
  const { loading, message } = props;
  return (
    loading && (
      <Modal
        centered
        className="w-25 h-25 top-50 start-50 translate-middle"
        style={{ zIndex: '10000' }}
        contentClassName="align-items-center border-0"
        animation
        show={loading}
      >
        <div className="mb-3 text-center">
          <span className="fs-4 fw-bold">Initializing...</span>
          {message}
        </div>
        <i className="fa fa-spinner fa-pulse fa-3x fa-fw" aria-hidden="true" />
      </Modal>
    )
  );
}

export default LoadingEditorModal;

LoadingEditorModal.propTypes = { loading: PropTypes.bool, message: PropTypes.node };
LoadingEditorModal.defaultProps = { loading: false, message: '' };

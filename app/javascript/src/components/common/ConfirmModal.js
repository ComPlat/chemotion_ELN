import React from 'react';
import PropTypes from 'prop-types';
import AppModal from 'src/components/common/AppModal';

function ConfirmModal({
  showModal, title, content, onClick, dialogClassName
}) {
  return (
    <AppModal
      show={showModal}
      onHide={() => onClick(false)}
      animation
      dialogClassName={dialogClassName}
      title={title}
      closeLabel="No"
      primaryActionLabel="Yes"
      onPrimaryAction={() => onClick(true)}
    >
      {content}
    </AppModal>
  );
}

ConfirmModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  title: PropTypes.node.isRequired,
  content: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  dialogClassName: PropTypes.string,
};

ConfirmModal.defaultProps = {
  dialogClassName: undefined,
};

export default ConfirmModal;

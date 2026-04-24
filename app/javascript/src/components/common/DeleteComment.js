import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import AppModal from 'src/components/common/AppModal';

export default class DeleteComment extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showConfirmModal: false,
    };
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalShow = this.handleModalShow.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
  }

  handleModalShow() {
    this.setState({ showConfirmModal: true });
  }

  handleModalClose() {
    this.setState({ showConfirmModal: false });
  }

  handleDelete = () => {
    const { onDelete, comment } = this.props;
    onDelete(comment);
    this.handleModalClose();
  };

  render() {
    const { showConfirmModal } = this.state;

    return (
      <>
        <Button
          variant="danger"
          size="xsm"
          onClick={() => this.handleModalShow(true)}
        >
          <i className="fa fa-trash-o" />
        </Button>
        <AppModal
          show={showConfirmModal}
          onHide={this.handleModalClose}
          title="Confirm Delete"
          closeLabel="Close"
          primaryActionLabel="Delete"
          onPrimaryAction={this.handleDelete}
        >
          <p>Are you sure you want to delete?</p>
        </AppModal>
      </>
    );
  }
}

DeleteComment.propTypes = {
  onDelete: PropTypes.func.isRequired,
  comment: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
};

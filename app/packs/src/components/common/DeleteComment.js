import React, { Component } from 'react';
import { Button, Modal } from 'react-bootstrap';
import PropTypes from 'prop-types';

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
          id="deleteCommentBtn"
          variant="danger"
          size="xsm"
          onClick={() => this.handleModalShow(true)}
        >
          <i className="fa fa-trash-o" />
        </Button>
        <Modal centered show={showConfirmModal} onHide={this.handleModalClose}>
          <Modal.Header closeButton>
            <Modal.Title>
              Confirm Delete
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to delete?</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={this.handleModalClose} className="pull-left">Close</Button>
            <Button variant="danger" onClick={this.handleDelete} className="pull-left">Delete</Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

DeleteComment.propTypes = {
  onDelete: PropTypes.func.isRequired,
  comment: PropTypes.object.isRequired,
};

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Form, ButtonToolbar } from 'react-bootstrap';
import Draggable from 'react-draggable';
import CommentFetcher from 'src/fetchers/CommentFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import CommentTable from 'src/components/comments/CommentTable';
import {
  formatSection,
  getAllComments,
  getSectionComments,
} from 'src/utilities/CommentHelper';

export default class CommentModal extends Component {
  constructor(props) {
    super(props);
    this.modalRef = React.createRef();
    this.commentInputRef = React.createRef();
    const commentState = CommentStore.getState();
    this.state = {
      commentBody: '',
      isEditing: false,
      commentObj: '',
      commentsCollapseAll: false,
      comments: commentState.comments,
      section: commentState.section,
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
    CommentStore.listen(this.onChange);
  }

  componentWillUnmount() {
    CommentStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState({ ...state });
  }

  handleInputChange = (e) => {
    this.setState({ commentBody: e.target.value });
    if (e.target.value.length === 0) {
      this.setState({
        commentObj: '',
        isEditing: false,
      });
    }
  };

  saveComment = () => {
    LoadingActions.start();
    const { element } = this.props;
    const { commentBody, section } = this.state;
    const params = {
      content: commentBody,
      commentable_id: element.id,
      commentable_type: element.type,
      section,
    };
    CommentFetcher.create(params)
      .then(() => {
        CommentActions.fetchComments(element);
        this.scrollToTop();
        ElementActions.refreshElements(element.type);
        this.setState({ commentBody: '' }, () => {
          LoadingActions.stop();
        });
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  updateComment = () => {
    LoadingActions.start();
    const { element } = this.props;
    const { commentBody, commentObj } = this.state;
    const comment = commentObj;
    const params = {
      content: commentBody,
    };
    CommentFetcher.updateComment(comment, params)
      .then(() => {
        CommentActions.fetchComments(element);
        this.setState({ commentBody: '', isEditing: false }, () => {
          LoadingActions.stop();
        });
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  deleteComment = (comment) => {
    const { element } = this.props;
    CommentFetcher.delete(comment)
      .then(() => {
        CommentActions.fetchComments(element);
        ElementActions.refreshElements(element.type);
        this.setState({ commentBody: '' });
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  editComment = (comment) => {
    this.setState({
      commentBody: comment.content,
      commentObj: comment,
      isEditing: true,
    });
    this.commentInputRef.current.focus();
  };

  scrollToTop = () => {
    this.modalRef.current.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  toggleCollapse = () => {
    const { commentsCollapseAll } = this.state;
    this.setState({ commentsCollapseAll: !commentsCollapseAll });
  };

  render() {
    const { element } = this.props;
    const {
      isEditing,
      commentsCollapseAll,
      commentBody,
      showCommentModal,
      comments,
      section
    } = this.state;
    const allComments = getAllComments(comments, section);
    const sectionComments = getSectionComments(comments, section);

    return (
      <Draggable enableUserSelectHack={false}>
        <Modal
          centered
          show={showCommentModal}
          onHide={() => CommentActions.toggleCommentModal(false)}
          size="xl"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Comments on:
              {formatSection(section)}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="commentList" ref={this.modalRef}>
              <CommentTable
                element={element}
                comments={sectionComments}
                editComment={this.editComment}
                deleteComment={this.deleteComment}
                showSection={false}
              />
              {
                allComments?.length > 0
                && (
                  <Button variant="light" onClick={this.toggleCollapse} className="mb-3">
                    <span>Details </span>
                    <i className="fa fa-solid fa-angle-down fw-bold text-primary" />
                  </Button>
                )
              }

              {
                commentsCollapseAll && allComments?.length > 0
                && (
                  <CommentTable
                    element={element}
                    comments={allComments}
                    editComment={this.editComment}
                    deleteComment={this.deleteComment}
                    showSection={true}
                  />
                )
              }
            </div>
            <Form.Control
              as="textarea"
              rows={5}
              autoFocus
              value={commentBody}
              ref={this.commentInputRef}
              onChange={this.handleInputChange}
            />

          </Modal.Body>
          <Modal.Footer className="modal-footer border-0">
            <ButtonToolbar className="gap-2">
              <Button
                variant="secondary"
                onClick={() => CommentActions.toggleCommentModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                disabled={!commentBody}
                onClick={() => {
                  if (isEditing) {
                    this.updateComment();
                  } else {
                    this.saveComment();
                  }
                }}
              >
                {isEditing ? 'Update' : 'Save'}
              </Button>
            </ButtonToolbar>
          </Modal.Footer>
        </Modal>
      </Draggable>
    );
  }
}

CommentModal.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
};

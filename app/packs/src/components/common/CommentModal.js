import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Modal, Table, Form
} from 'react-bootstrap';
import Draggable from 'react-draggable';
import CommentFetcher from 'src/fetchers/CommentFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import CommentDetails from 'src/components/comments/CommentDetails';
import DeleteComment from 'src/components/common/DeleteComment';
import {
  formatSection,
  getAllComments,
  getSectionComments,
  selectCurrentUser,
} from 'src/utilities/CommentHelper';
import { formatDate } from 'src/utilities/timezoneHelper';

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

  markCommentResolved = (comment) => {
    const { element } = this.props;
    const params = {
      content: comment.content,
      status: 'Resolved',
    };
    CommentFetcher.updateComment(comment, params)
      .then(() => {
        CommentActions.fetchComments(element);
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
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
      isEditing: true
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

  // eslint-disable-next-line class-methods-use-this
  disableEditComment = (comment) => comment.status === 'Resolved';

  // eslint-disable-next-line class-methods-use-this
  commentByCurrentUser = (comment, currentUser) => currentUser.id === comment.created_by;

  renderCommentTable() {
    const { comments, section } = this.state;
    const sectionComments = getSectionComments(comments, section);
    const currentUser = selectCurrentUser(UserStore.getState());

    if (sectionComments?.length > 0) {
      return sectionComments.map((comment) => (
        <tr key={comment.id}>
          <td className="w-20">
            <span className="text-info">
              {formatDate(comment.created_at)}
            </span>
          </td>
          <td className="w-35">{comment.content}</td>
          <td className="w-15">{comment.submitter}</td>
          <td className="w-15">
            <div className="d-inline-block">
              <Button
                disabled={this.disableEditComment(comment)}
                onClick={() => this.markCommentResolved(comment)}
                size="sm"
                className="me-1"
              >
                {comment.status === 'Resolved' ? 'Resolved' : 'Resolve'}
              </Button>
              {
                this.commentByCurrentUser(comment, currentUser)
                  ? (
                    <Button
                      id="editCommentBtn"
                      size="sm"
                      variant="primary"
                      onClick={() => this.editComment(comment)}
                      disabled={this.disableEditComment(comment)}
                      className="me-1"
                    >
                      <i className="fa fa-edit" />
                    </Button>
                  )
                  : null
              }
              {
                this.commentByCurrentUser(comment, currentUser)
                  ? (
                    <DeleteComment
                      comment={comment}
                      onDelete={() => this.deleteComment(comment)}
                    />
                  ) : null
              }
            </div>
          </td>
          <td className="w-15">{comment.resolver_name}</td>
        </tr>
      ));
    }
    return null;
  }

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

    return (
      <Draggable enableUserSelectHack={false}>
        <Modal
          centered
          dialogClassName="comment-modal"
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
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="w-35">Comment</th>
                      <th className="w-15">From User</th>
                      <th className="w-17">Actions</th>
                      <th className="w-17">Resolved By</th>
                    </tr>
                  </thead>
                  <tbody>{this.renderCommentTable()}</tbody>
                </Table>
              </div>

              {
                allComments?.length > 0
                  ? (
                    <Button onClick={this.toggleCollapse} id="detailsBtn">
                      <span>Details </span>
                      <i className="fa-solid fa-angle-down" />
                    </Button>
                  )
                  : null
              }

              {
                commentsCollapseAll && allComments?.length > 0
                  ? (
                    <CommentDetails
                      section={section}
                      element={element}
                      disableEditComment={this.disableEditComment}
                      markCommentResolved={this.markCommentResolved}
                      commentByCurrentUser={this.commentByCurrentUser}
                      editComment={this.editComment}
                      deleteComment={this.deleteComment}
                    />
                  )
                  : null
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
            <div className="d-inline-block">
              <Button
                variant="secondary"
                onClick={() => CommentActions.toggleCommentModal(false)}
                className="me-1"
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
            </div>
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

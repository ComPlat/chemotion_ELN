import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, FormControl, Modal, Table } from 'react-bootstrap';
import Draggable from 'react-draggable';
import CommentFetcher from '../../fetchers/CommentFetcher';
import LoadingActions from '../../actions/LoadingActions';


export default class CommentModal extends Component {
  constructor(props) {
    super(props);
    this.textInput = React.createRef();
    this.state = {
      commentBody: '',
      isEditing: false,
      commentObj: '',
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  handleInputChange = (e) => {
    this.setState({ commentBody: e.target.value });
    if (e.target.value.length === 0) {
      this.setState({
        commentObj: '',
        isEditing: false,
      });
    }
  }

  markCommentResolved = (comment) => {
    const params = {
      content: comment.content,
      status: 'Resolved',
    };
    CommentFetcher.updateComment(comment, params)
      .then(() => {
        this.props.fetchComments();
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  saveComment = () => {
    LoadingActions.start();
    const { elementId, elementType, section } = this.props;
    const { commentBody } = this.state;
    const params = {
      content: commentBody,
      commentable_id: elementId,
      commentable_type: elementType,
      section,
    };
    CommentFetcher.create(params)
      .then(() => {
        this.props.fetchComments();
        this.setState({ commentBody: '' }, () => {
          this.props.toggleCommentModal(false);
          LoadingActions.stop();
        });
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateComment = () => {
    LoadingActions.start();
    const { commentBody } = this.state;
    const comment = this.state.commentObj;
    const params = {
      content: commentBody,
    };
    CommentFetcher.updateComment(comment, params)
      .then(() => {
        this.props.fetchComments();
        this.setState({ commentBody: '' }, () => {
          this.props.toggleCommentModal(false);
          LoadingActions.stop();
        });
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  deleteComment = (comment) => {
    CommentFetcher.delete(comment)
      .then(() => {
        this.props.fetchComments();
        this.setState({ commentBody: '' });
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  handleEditComment = (comment) => {
    this.setState({
      commentBody: comment.content,
      commentObj: comment,
      isEditing: true
    });
    this.commentInput.focus();
  }

  render() {
    const { showCommentModal, section } = this.props;
    const { isEditing } = this.state;
    const comments = this.props.getSectionComments(section);

    let commentsTbl = null;
    if (comments && comments.length > 0) {
      commentsTbl = comments.map(comment => (
        <tr key={comment.id}>
          <td style={{ width: '15%' }}>{comment.created_at}</td>
          <td style={{ width: '40%' }}>{comment.content}</td>
          <td style={{ width: '15%' }}>{comment.submitter}</td>
          <td style={{ width: '15%' }}>
            <ButtonToolbar>
              <Button
                disabled={comment.status === 'Resolved'}
                onClick={() => this.markCommentResolved(comment)}
              >
                {comment.status === 'Resolved' ? 'Resolved' : 'Resolve'}
              </Button>
              <Button
                id="editCommentBtn"
                bsSize="xsmall"
                bsStyle="primary"
                onClick={() => this.handleEditComment(comment)}
                // disabled={isDisabled}
              >
                <i className="fa fa-edit" />
              </Button>
              <Button
                id="deleteCommentBtn"
                bsStyle="danger"
                bsSize="xsmall"
                onClick={() => this.deleteComment(comment)}
              >
                <i className="fa fa-trash-o" />
              </Button>
            </ButtonToolbar>
          </td>
        </tr>
      ));
    }

    const defaultAttrs = {
      style: {
        height: '100px',
        overflow: 'auto',
        whiteSpace: 'pre',
        marginBottom: '20px',
      },
    };

    return (
      <Draggable>
        <Modal
          show={showCommentModal}
          onHide={() => this.props.toggleCommentModal(false)}
          bsSize="large"
          backdrop="static"
        >
          <Modal.Header closeButton>
            <Modal.Title>Comments</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th width="20%">Date</th>
                    <th width="40%">Comment</th>
                    <th width="15%">From User</th>
                    <th width="17%">Actions</th>
                  </tr>
                </thead>
                <tbody>{commentsTbl}</tbody>
              </Table>
            </div>
            <FormControl
              componentClass="textarea"
              autoFocus
              {...defaultAttrs}
              value={this.state.commentBody}
              ref={(input) => { this.nameInput = input; }}
              inputRef={(m) => {
                this.commentInput = m;
              }}
              onChange={this.handleInputChange}
            />
            <ButtonToolbar>
              <Button onClick={() => this.props.toggleCommentModal(false)}>
                Close
              </Button>
              <Button
                bsStyle="primary"
                disabled={!this.state.commentBody}
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
          </Modal.Body>
        </Modal>
      </Draggable>
    );
  }
}

CommentModal.propTypes = {
  showCommentModal: PropTypes.bool,
  toggleCommentModal: PropTypes.func.isRequired,
  comments: PropTypes.array,
  fetchComments: PropTypes.func.isRequired,
  getOwnComment: PropTypes.func.isRequired,
  getSectionComments: PropTypes.func.isRequired,
  section: PropTypes.string,
  elementId: PropTypes.number.isRequired,
  elementType: PropTypes.string.isRequired,
};

CommentModal.defaultProps = {
  showCommentModal: false,
  comments: [],
  section: 'sample_header',
};

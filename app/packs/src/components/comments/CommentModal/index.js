import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Button, ButtonToolbar, FormControl, Modal, Table,} from 'react-bootstrap';
import CommentFetcher from '../../fetchers/CommentFetcher';
import UserStore from '../../stores/UserStore';
import LoadingActions from '../../actions/LoadingActions';


export default class CommentModal extends Component {
  constructor(props) {
    super(props);
    const comment = this.getOwnComment();
    this.state = {
      commentBody: comment && comment.content ? comment.content : '',
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  getOwnComment = () => {
    const { comments } = this.props;
    const { currentUser } = UserStore.getState();

    return comments && comments.find(cmt => ((cmt.created_by === currentUser.id) && cmt.section === 'header'));
  }

  handleInputChange = (e) => {
    this.setState({ commentBody: e.target.value });
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

  deleteComment = (comment) => {
    CommentFetcher.delete(comment)
      .then(() => {
        this.props.fetchComments();
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  render() {
    const { showCommentModal, comments } = this.props;

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
                id="deleteCommentBtn"
                bsStyle="danger"
                bsSize="xsmall"
                className="button-right"
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
                  <th width="15%">Actions</th>
                </tr>
              </thead>
              <tbody>{commentsTbl}</tbody>
            </Table>
          </div>
          <FormControl
            componentClass="textarea"
            {...defaultAttrs}
            value={this.state.commentBody}
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
              onClick={() => this.saveComment()}
            >
              Save
            </Button>
          </ButtonToolbar>
        </Modal.Body>
      </Modal>
    );
  }
}

CommentModal.propTypes = {
  showCommentModal: PropTypes.bool,
  toggleCommentModal: PropTypes.func.isRequired,
  comments: PropTypes.array,
  fetchComments: PropTypes.func.isRequired,
  section: PropTypes.string,
  elementId: PropTypes.number.isRequired,
  elementType: PropTypes.string.isRequired,
};

CommentModal.defaultProps = {
  showCommentModal: false,
  comments: [],
  section: 'header',
};

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Table } from 'react-bootstrap';
import { Confirm } from 'react-confirm-bootstrap';
import moment from 'moment';
import UserStore from 'src/stores/alt/stores/UserStore';
import { formatSection, getAllComments, selectCurrentUser } from 'src/utilities/CommentHelper';
import CommentStore from 'src/stores/alt/stores/CommentStore';

export default class CommentDetails extends Component {
  constructor(props) {
    super(props);
    const commentState = CommentStore.getState();
    this.state = {
      comments: commentState.comments,
      section: commentState.section,
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    CommentStore.listen(this.onChange);
  }

  componentWillUnmount() {
    CommentStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState({ ...state });
  }

  render() {
    const {
      element,
      disableEditComment,
      markCommentResolved,
      commentByCurrentUser,
      editComment,
      deleteComment,
    } = this.props;
    const { comments, section } = this.state;
    const allComments = getAllComments(comments, section);
    const currentUser = selectCurrentUser(UserStore.getState());

    let commentsTbl = null;
    if (allComments?.length > 0) {
      commentsTbl = allComments.map((comment) => (
        <tr key={comment.id}>
          <td width="10%">{formatSection(comment.section, element.type)}</td>
          <td width="10%">
            <span className="text-info">
              {moment(comment.created_at).format('DD.MM.YYYY HH:mm')}
            </span>
          </td>
          <td width="34%">{comment.content}</td>
          <td width="15%">{comment.submitter}</td>
          <td width="15%">
            <ButtonToolbar>
              <Button
                disabled={disableEditComment(comment)}
                onClick={() => markCommentResolved(comment)}
              >
                {comment.status === 'Resolved' ? 'Resolved' : 'Resolve'}
              </Button>
              {
                commentByCurrentUser(comment, currentUser)
                  ? (
                    <Button
                      id="editCommentBtn"
                      bsSize="xsmall"
                      bsStyle="primary"
                      onClick={() => editComment(comment)}
                      disabled={disableEditComment(comment)}
                    >
                      <i className="fa fa-edit" />
                    </Button>
                  )
                  : null
              }
              {
                commentByCurrentUser(comment, currentUser)
                  ? (
                    <Confirm
                      onConfirm={() => deleteComment(comment)}
                      body="Are you sure you want to delete this?"
                      confirmText="Confirm Delete"
                      title="Deleting Comment"
                      showCancelButton
                    >
                      <Button
                        id="deleteCommentBtn"
                        bsStyle="danger"
                        bsSize="xsmall"
                        onClick={() => deleteComment(comment)}
                      >
                        <i className="fa fa-trash-o" />
                      </Button>
                    </Confirm>
                  ) : null
              }
            </ButtonToolbar>
          </td>
          <td width="15%">{comment.resolver_name}</td>
        </tr>
      ));
    }

    return (
      <Table striped bordered hover>
        <thead>
          <tr>
            <th width="10%">Column</th>
            <th width="10%">Date</th>
            <th width="34%">Comment</th>
            <th width="15%">From User</th>
            <th width="17%">Actions</th>
            <th width="17%">Resolved By</th>
          </tr>
        </thead>
        <tbody>{commentsTbl}</tbody>
      </Table>
    );
  }
}

CommentDetails.propTypes = {
  element: PropTypes.object.isRequired,
  disableEditComment: PropTypes.func.isRequired,
  markCommentResolved: PropTypes.func.isRequired,
  commentByCurrentUser: PropTypes.func.isRequired,
  editComment: PropTypes.func.isRequired,
  deleteComment: PropTypes.func.isRequired,
};

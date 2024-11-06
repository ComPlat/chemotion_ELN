import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Table } from 'react-bootstrap';
import UserStore from 'src/stores/alt/stores/UserStore';
import { formatSection, getAllComments, selectCurrentUser } from 'src/utilities/CommentHelper';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import DeleteComment from 'src/components/common/DeleteComment';
import { formatDate } from 'src/utilities/timezoneHelper';

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
          <td>{formatSection(comment.section, element.type)}</td>
          <td>
            <span className="text-info">
              {formatDate(comment.created_at)}
            </span>
          </td>
          <td>{comment.content}</td>
          <td>{comment.submitter}</td>
          <td>
            <ButtonToolbar>
              <Button
                disabled={disableEditComment(comment)}
                onClick={() => markCommentResolved(comment)}
                variant="light"
              >
                {comment.status === 'Resolved' ? 'Resolved' : 'Resolve'}
              </Button>
              {
                commentByCurrentUser(comment, currentUser)
                  && (
                    <Button
                      id="editCommentBtn"
                      size="xsm"
                      variant="primary"
                      onClick={() => editComment(comment)}
                      disabled={disableEditComment(comment)}
                    >
                      <i className="fa fa-edit" />
                    </Button>
                  )
              }
              {
                commentByCurrentUser(comment, currentUser)
                  && (
                    <DeleteComment
                      comment={comment}
                      onDelete={() => deleteComment(comment)}
                    />
                  )
              }
            </ButtonToolbar>
          </td>
          <td>{comment.resolver_name}</td>
        </tr>
      ));
    }

    return (
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Column</th>
            <th>Date</th>
            <th>Comment</th>
            <th>From User</th>
            <th>Actions</th>
            <th>Resolved By</th>
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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Table } from 'react-bootstrap';
import { Confirm } from 'react-confirm-bootstrap';
import UserStore from '../../stores/UserStore';
import { formatSection } from '../../../helper/index';

export default class CommentDetails extends Component {
  render() {
    const { section, element } = this.props;
    const comments = this.props.getAllComments(section);
    const { currentUser } = UserStore.getState();

    let commentsTbl = null;
    if (comments && comments.length > 0) {
      commentsTbl = comments.map(comment => (
        <tr key={comment.id}>
          <td width="10%">{formatSection(comment.section, element.type)}</td>
          <td width="10%">{comment.created_at}</td>
          <td width="34%">{comment.content}</td>
          <td width="15%">{comment.submitter}</td>
          <td width="15%">
            <ButtonToolbar>
              <Button
                disabled={this.props.disableEditComment(comment)}
                onClick={() => this.props.markCommentResolved(comment)}
              >
                {comment.status === 'Resolved' ? 'Resolved' : 'Resolve'}
              </Button>
              {
                this.props.commentByCurrentUser(comment, currentUser) &&
                <Button
                  id="editCommentBtn"
                  bsSize="xsmall"
                  bsStyle="primary"
                  onClick={() => this.props.handleEditComment(comment)}
                  disabled={this.props.disableEditComment(comment)}
                >
                  <i className="fa fa-edit" />
                </Button>
              }
              {
                this.props.commentByCurrentUser(comment, currentUser) &&
                <Confirm
                  onConfirm={() => this.props.deleteComment(comment)}
                  body="Are you sure you want to delete this?"
                  confirmText="Confirm Delete"
                  title="Deleting Comment"
                  showCancelButton
                >
                  <Button
                    id="deleteCommentBtn"
                    bsStyle="danger"
                    bsSize="xsmall"
                    onClick={() => this.props.deleteComment(comment)}
                  >
                    <i className="fa fa-trash-o" />
                  </Button>
                </Confirm>
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
  section: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  getAllComments: PropTypes.func.isRequired,
  disableEditComment: PropTypes.func.isRequired,
  markCommentResolved: PropTypes.func.isRequired,
  commentByCurrentUser: PropTypes.func.isRequired,
  handleEditComment: PropTypes.func.isRequired,
  deleteComment: PropTypes.func.isRequired,
};

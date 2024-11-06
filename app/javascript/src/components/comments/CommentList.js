import React from 'react';
import PropTypes from 'prop-types';
import { Table } from 'react-bootstrap';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import { getSectionComments } from 'src/utilities/CommentHelper';
import { formatDate } from 'src/utilities/timezoneHelper';

export default function CommentList(props) {
  const { section } = props;
  const { comments } = CommentStore.getState();
  const sectionComments = getSectionComments(comments, section)
    ?.filter((cmt) => cmt.status === 'Pending');

  let commentsTbl = null;

  if (sectionComments?.length > 0) {
    commentsTbl = sectionComments.map((comment) => (
      <tr key={comment.id}>
        <td>{formatDate(comment.created_at)}</td>
        <td>{comment.content}</td>
        <td>{comment.submitter}</td>
      </tr>
    ));
  }

  return (
    <div>
      {
        (sectionComments?.length > 0)
          && (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Comment</th>
                  <th>From User</th>
                </tr>
              </thead>
              <tbody>{commentsTbl}</tbody>
            </Table>
          )
      }
    </div>
  );
}

CommentList.propTypes = {
  section: PropTypes.string,
};

CommentList.defaultProps = {
  section: 'header',
};

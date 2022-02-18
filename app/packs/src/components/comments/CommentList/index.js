import React from 'react';
import PropTypes from 'prop-types';
import { Table } from 'react-bootstrap';

export default function CommentList(props) {
  const { section } = props;
  const sectionComments = props.getSectionComments(section);
  const comments = sectionComments.filter(cmt => (cmt.status === 'Pending'));

  let commentsTbl = null;

  if (comments && comments.length > 0) {
    commentsTbl = comments.map(comment => (
      <tr key={comment.id}>
        <td style={{ width: '15%' }}>{comment.created_at}</td>
        <td style={{ width: '40%' }}>{comment.content}</td>
        <td style={{ width: '15%' }}>{comment.submitter}</td>
      </tr>
    ));
  }

  return (
    <div>
      {
        (comments && comments.length > 0) ?
          <Table striped bordered hover>
            <thead>
              <tr>
                <th width="15%">Date</th>
                <th width="40%">Comment</th>
                <th width="15%">From User</th>
              </tr>
            </thead>
            <tbody>{commentsTbl}</tbody>
          </Table> : null
      }
    </div>
  );
}


CommentList.propTypes = {
  section: PropTypes.string,
  getSectionComments: PropTypes.func.isRequired,
};

CommentList.defaultProps = {
  section: 'header',
};

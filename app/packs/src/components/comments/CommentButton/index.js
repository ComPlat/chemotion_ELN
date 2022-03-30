import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default function CommentButton(props) {
  const { section } = props;
  const comments = props.getSectionComments(section);
  return (
    <OverlayTrigger
      key="ot_comments"
      placement="top"
      overlay={<Tooltip id="showComments">Show/Add Comments</Tooltip>}
    >
      <Button
        id="commentBtn"
        bsStyle={comments && comments.length > 0 ? 'success' : 'default'}
        bsSize="xsmall"
        onClick={() => {
          props.toggleCommentModal(true);
          props.setCommentSection(section);
        }}
      >
        <i className="fa fa-comments" />
      </Button>
    </OverlayTrigger>
  );
}


CommentButton.propTypes = {
  section: PropTypes.string,
  toggleCommentModal: PropTypes.func.isRequired,
  getSectionComments: PropTypes.func.isRequired,
  setCommentSection: PropTypes.func.isRequired,
};

CommentButton.defaultProps = {
  section: 'sample_header',
};

import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default function CommentIcon(props) {
  const comments = props.comments || [];
  return (
    comments && comments.length > 0 &&
    <OverlayTrigger
      key="ot_comments"
      placement="bottom"
      overlay={<Tooltip id="showCommentsCount">{`${comments.length} comment/s`}</Tooltip>}
    >
      <span className="commentIcon">
        <i className="fa fa-comments" />
      </span>
    </OverlayTrigger>
  );
}


CommentIcon.propTypes = {
  comments: PropTypes.array,
};

CommentIcon.defaultProps = {
  comments: [],
};

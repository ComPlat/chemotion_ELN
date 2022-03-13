import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default function CommentIcon(props) {
  const commentCount = props.commentCount || 0;
  return (
    commentCount && commentCount > 0 ?
      <OverlayTrigger
        key="ot_comments"
        placement="bottom"
        overlay={<Tooltip id="showCommentsCount">{`${commentCount} comment/s`}</Tooltip>}
      >
        <span className="commentIcon">
          <i className="fa fa-comments" />
        </span>
      </OverlayTrigger> :
      <span />
  );
}


CommentIcon.propTypes = {
  commentCount: PropTypes.number,
};

CommentIcon.defaultProps = {
  commentCount: null,
};

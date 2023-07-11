import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import UserStore from 'src/stores/alt/stores/UserStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import { selectCurrentUser, commentActivation } from 'src/utilities/CommentHelper';

export default function CommentIcon(props) {
  const { commentCount } = props;
  const currentUser = selectCurrentUser(UserStore.getState());

  if (MatrixCheck(currentUser.matrix, commentActivation)) {
    return (
      commentCount && commentCount > 0
        ? (
          <OverlayTrigger
            key="ot_comments"
            placement="bottom"
            overlay={<Tooltip id="showCommentsCount">{`${commentCount} comment/s`}</Tooltip>}
          >
            <span className="commentIcon">
              <i className="fa fa-comments" />
            </span>
          </OverlayTrigger>
        )
        : <span />
    );
  }
  return null;
}

CommentIcon.propTypes = {
  commentCount: PropTypes.number,
};

CommentIcon.defaultProps = {
  commentCount: null,
};

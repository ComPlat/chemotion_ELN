import React, { useContext } from 'react';
import { OverlayTrigger, Tooltip, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import { commentActivation } from 'src/utilities/CommentHelper';

const CommentIcon = (props) => {
  const { currentUser } = useContext(StoreContext).userStore;
  const { commentCount } = props;

  if (MatrixCheck(currentUser.matrix, commentActivation)) {
    return (
      commentCount && commentCount > 0
        ? (
          <OverlayTrigger
            key="ot_comments"
            placement="bottom"
            overlay={<Tooltip id="showCommentsCount">{`${commentCount} comment/s`}</Tooltip>}
          >
            <Button variant="light" size="xxsm">
              <i className="fa fa-comments" />
            </Button>
          </OverlayTrigger>
        )
        : null
    );
  }
  return null;
};

CommentIcon.propTypes = {
  commentCount: PropTypes.number,
};

CommentIcon.defaultProps = {
  commentCount: null,
};

export default CommentIcon;

import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import {
  getSectionComments,
  selectCurrentUser,
  commentActivation
} from 'src/utilities/CommentHelper';

export default function HeaderCommentSection(props) {
  const { element } = props;
  const headerSection = `${element.type}_header`;
  const currentUser = selectCurrentUser(UserStore.getState());
  const { showCommentSection, comments } = CommentStore.getState();
  const sectionComments = getSectionComments(comments, headerSection);

  if (MatrixCheck(currentUser.matrix, commentActivation)) {
    return (
      element?.isNew
        ? <span /> : (
          <span style={{ marginLeft: '10px' }}>
            <OverlayTrigger
              key="ot_comments"
              placement="top"
              overlay={<Tooltip id="showComments">Show/Add Comments</Tooltip>}
            >
              <Button
                bsSize="xsmall"
                bsStyle={sectionComments?.length > 0 ? 'success' : 'default'}
                onClick={() => {
                  CommentActions.setCommentSection(headerSection);
                  CommentActions.toggleCommentModal(true);
                }}
              >
                <i className="fa fa-comments" />
                &nbsp;
                Comments
              </Button>
            </OverlayTrigger>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="toggleComments">Show/Hide Section Comments</Tooltip>}
            >
              <Button
                bsSize="xsmall"
                onClick={CommentActions.toggleCommentSection}
                style={{ marginLeft: 5 }}
              >
                <span>
                  <i className={showCommentSection ? 'fa fa-angle-down' : 'fa fa-angle-up'} />
                </span>
              </Button>
            </OverlayTrigger>
          </span>
        )
    );
  }
  return null;
}

HeaderCommentSection.propTypes = {
  element: PropTypes.object.isRequired,
};

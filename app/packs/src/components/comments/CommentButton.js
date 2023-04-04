import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import { getSectionComments } from 'src/utilities/CommentHelper';

export default function CommentButton(props) {
  const { section } = props;
  const { comments } = CommentStore.getState();
  const sectionComments = getSectionComments(comments, section);

  return (
    <OverlayTrigger
      key="ot_comments"
      placement="top"
      overlay={<Tooltip id="showComments">Show/Add Comments</Tooltip>}
    >
      <Button
        id="commentBtn"
        bsStyle={sectionComments.length > 0 ? 'success' : 'default'}
        bsSize="xsmall"
        onClick={() => {
          CommentActions.toggleCommentModal(true);
          CommentActions.setCommentSection(section);
        }}
      >
        <i className="fa fa-comments" />
      </Button>
    </OverlayTrigger>
  );
}

CommentButton.propTypes = {
  section: PropTypes.string,
};

CommentButton.defaultProps = {
  section: 'sample_header',
};

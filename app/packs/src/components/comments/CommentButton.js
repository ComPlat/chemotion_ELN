import React, { useState, useEffect } from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import { getSectionComments } from 'src/utilities/CommentHelper';

export default function CommentButton(props) {
  const { section, element } = props;
  const [commentState, setCommentState] = useState(CommentStore.getState());
  const { comments } = commentState;
  const sectionComments = getSectionComments(comments, section);

  useEffect(() => {
    const onChange = (state) => {
      setCommentState({ ...state });
    };
    CommentStore.listen(onChange);
    return () => {
      CommentStore.unlisten(onChange);
    };
  }, []);

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
          CommentActions.fetchComments(element);
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
  element: PropTypes.object.isRequired,
};

CommentButton.defaultProps = {
  section: 'sample_header',
};

import React from 'react';
import PropTypes from 'prop-types';
import CommentButton from '../CommentButton';
import CommentList from '../CommentList';

export default function CommentSection(props) {
  const { comments, section } = props;
  return (
    <div>
      <CommentButton
        section={section}
        comments={comments}
        toggleCommentModal={props.toggleCommentModal}
        getSectionComments={props.getSectionComments}
      />

      <CommentList
        section={section}
        getSectionComments={props.getSectionComments}
      />
    </div>
  );
}


CommentSection.propTypes = {
  section: PropTypes.string,
  comments: PropTypes.array,
  toggleCommentModal: PropTypes.func.isRequired,
  getSectionComments: PropTypes.func.isRequired,
};

CommentSection.defaultProps = {
  section: 'header',
  comments: [],
};

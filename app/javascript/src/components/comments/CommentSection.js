import React, { useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import CommentButton from 'src/components/comments/CommentButton';
import CommentList from 'src/components/comments/CommentList';
import { StoreContext } from 'src/stores/mobx/RootStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import { commentActivation } from 'src/utilities/CommentHelper';

const CommentSection = ({ section, element }) => {
  const { currentUser } = useContext(StoreContext).userStore;
  const [showCommentSection, setShowCommentSection] = useState(
    () => CommentStore.getState().showCommentSection
  );

  const onChange = useCallback((state) => {
    setShowCommentSection(state.showCommentSection);
  }, []);

  useEffect(() => {
    CommentStore.listen(onChange);
    return () => CommentStore.unlisten(onChange);
  }, [onChange]);

  if (showCommentSection && MatrixCheck(currentUser.matrix, commentActivation)) {
    return (
      <div className="d-flex flex-column gap-2 align-items-start">
        <CommentButton section={section} element={element} />
        <CommentList section={section} />
      </div>
    );
  }
  return null;
};

CommentSection.propTypes = {
  section: PropTypes.string,
  element: PropTypes.object.isRequired,
};

CommentSection.defaultProps = {
  section: 'header',
};

export default CommentSection;

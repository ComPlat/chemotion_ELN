import React, {
  useState, useEffect, useContext, useCallback
} from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar } from 'react-bootstrap';
import DetailCardButton from 'src/apps/mydb/elements/details/DetailCardButton';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import { StoreContext } from 'src/stores/mobx/RootStore';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import { getSectionComments, commentActivation } from 'src/utilities/CommentHelper';

const HeaderCommentSection = ({ element }) => {
  const { currentUser } = useContext(StoreContext).userStore;
  const [comments, setComments] = useState(() => CommentStore.getState().comments);
  const [showCommentSection, setShowCommentSection] = useState(
    () => CommentStore.getState().showCommentSection
  );

  const onChange = useCallback((state) => {
    setComments(state.comments);
    setShowCommentSection(state.showCommentSection);
  }, []);

  useEffect(() => {
    CommentStore.listen(onChange);
    return () => CommentStore.unlisten(onChange);
  }, [onChange]);

  const headerSection = `${element.type}_header`;
  const sectionComments = getSectionComments(comments, headerSection);

  if (MatrixCheck(currentUser?.matrix, commentActivation) && !element?.isNew) {
    return (
      <ButtonToolbar className="flex-nowrap">
        <DetailCardButton
          key="comments-button"
          label="Show/Add Comments"
          iconClass="fa fa-comments"
          active={sectionComments.length > 0}
          onClick={() => {
            CommentActions.setCommentSection(headerSection);
            CommentActions.fetchComments(element);
            CommentActions.toggleCommentModal(true);
          }}
          header
        />
        <DetailCardButton
          key="toggle-button"
          label="Show/Hide Section Comments"
          iconClass={showCommentSection ? 'fa fa-angle-down' : 'fa fa-angle-up'}
          onClick={CommentActions.toggleCommentSection}
          header
        />
      </ButtonToolbar>
    );
  }
  return null;
};

HeaderCommentSection.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
};

export default HeaderCommentSection;

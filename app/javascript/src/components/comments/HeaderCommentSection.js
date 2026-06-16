import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar } from 'react-bootstrap';
import DetailCardButton from 'src/apps/mydb/elements/details/DetailCardButton';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import {
  getSectionComments,
  selectCurrentUser,
  commentActivation
} from 'src/utilities/CommentHelper';

class HeaderCommentSection extends Component {
  constructor(props) {
    super(props);

    const currentUser = selectCurrentUser(UserStore.getState());
    const commentState = CommentStore.getState();

    this.state = {
      currentUser,
      comments: commentState.comments,
      showCommentSection: commentState.showCommentSection,
    };

    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    CommentStore.listen(this.onChange);
  }

  componentWillUnmount() {
    CommentStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState({ ...state });
  }

  render() {
    const { element } = this.props;
    const { comments, currentUser, showCommentSection } = this.state;
    const headerSection = `${element.type}_header`;

    const sectionComments = getSectionComments(comments, headerSection);

    if (MatrixCheck(currentUser.matrix, commentActivation) && !element?.isNew) {
      return (
        <ButtonToolbar>
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
  }
}

HeaderCommentSection.propTypes = {
  element: PropTypes.object.isRequired,
};

export default HeaderCommentSection;

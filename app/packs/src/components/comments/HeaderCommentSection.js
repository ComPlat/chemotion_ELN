import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, OverlayTrigger, Tooltip } from 'react-bootstrap';
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
        <ButtonToolbar className="gap-1">
          <OverlayTrigger
            key="ot_comments"
            placement="top"
            overlay={<Tooltip id="showComments">Show/Add Comments</Tooltip>}
          >
            <Button
              size="xsm"
              variant={sectionComments.length > 0 ? 'success' : 'light'}
              onClick={() => {
                CommentActions.setCommentSection(headerSection);
                CommentActions.fetchComments(element);
                CommentActions.toggleCommentModal(true);
              }}
            >
              <i className="fa fa-comments me-1" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="toggleComments">Show/Hide Section Comments</Tooltip>}
          >
            <Button
              size="xsm"
              variant="light"
              onClick={CommentActions.toggleCommentSection}
            >
              <i className={showCommentSection ? 'fa fa-angle-down' : 'fa fa-angle-up'} />
            </Button>
          </OverlayTrigger>
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

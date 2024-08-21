import React, { Component } from 'react';
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

    if (MatrixCheck(currentUser.matrix, commentActivation)) {
      return (
        element?.isNew ? <span /> : (
          <span className="comments-header-btn">
            <OverlayTrigger
              key="ot_comments"
              placement="top"
              overlay={<Tooltip id="showComments">Show/Add Comments</Tooltip>}
            >
              <Button
                bsSize="xsmall"
                bsStyle={sectionComments.length > 0 ? 'success' : 'default'}
                onClick={() => {
                  CommentActions.setCommentSection(headerSection);
                  CommentActions.fetchComments(element);
                  CommentActions.toggleCommentModal(true);
                }}
              >
                <i className="fa fa-comments" />
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
}

HeaderCommentSection.propTypes = {
  element: PropTypes.object.isRequired,
};

export default HeaderCommentSection;

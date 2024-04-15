import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CommentButton from 'src/components/comments/CommentButton';
import CommentList from 'src/components/comments/CommentList';
import UserStore from 'src/stores/alt/stores/UserStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import { selectCurrentUser, commentActivation } from 'src/utilities/CommentHelper';

export default class CommentSection extends Component {
  constructor(props) {
    super(props);
    const commentState = CommentStore.getState();
    this.state = {
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
    const { section, element } = this.props;
    const { showCommentSection } = this.state;
    const currentUser = selectCurrentUser(UserStore.getState());

    if (showCommentSection && MatrixCheck(currentUser.matrix, commentActivation)) {
      return (
        <div>
          <CommentButton section={section} element={element} />
          <CommentList section={section} />
        </div>
      );
    }
    return null;
  }
}

CommentSection.propTypes = {
  section: PropTypes.string,
  element: PropTypes.object.isRequired,
};

CommentSection.defaultProps = {
  section: 'header',
};

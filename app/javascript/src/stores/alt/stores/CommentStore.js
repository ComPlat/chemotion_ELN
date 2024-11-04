import alt from 'src/stores/alt/alt';
import CommentActions from 'src/stores/alt/actions/CommentActions';

class CommentStore {
  constructor() {
    this.state = {
      comments: [],
      section: null,
      showCommentModal: false,
      showCommentSection: false,
    };

    this.bindListeners({
      handleSetCommentSection: CommentActions.setCommentSection,
      handleFetchComments: CommentActions.fetchComments,
      handleToggleCommentModal: CommentActions.toggleCommentModal,
      handleToggleCommentSection: CommentActions.toggleCommentSection,
    });
  }

  handleSetCommentSection(section) {
    this.setState({ section });
  }

  handleFetchComments(comments) {
    this.setState({ comments: comments ?? [] });
  }

  handleToggleCommentModal = (btnAction) => {
    this.setState({ showCommentModal: btnAction });
  };

  handleToggleCommentSection() {
    this.setState({ showCommentSection: !this.state.showCommentSection });
  }
}

export default alt.createStore(CommentStore, 'CommentStore');

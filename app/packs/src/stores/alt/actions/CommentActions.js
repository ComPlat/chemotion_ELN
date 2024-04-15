/* eslint-disable class-methods-use-this */

import alt from 'src/stores/alt/alt';
import CommentFetcher from 'src/fetchers/CommentFetcher';

class CommentActions {
  setCommentSection(section) {
    return section;
  }

  fetchComments(element) {
    return (dispatch) => {
      CommentFetcher.fetchByCommentableId(element.id, element.type)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  toggleCommentModal(btnAction) {
    return btnAction;
  }

  toggleCommentSection() {
    return null;
  }
}

export default alt.createActions(CommentActions);

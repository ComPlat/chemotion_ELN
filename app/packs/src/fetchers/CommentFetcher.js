import 'whatwg-fetch';

import Comment from 'src/models/Comment';
import { CommentManagementServices } from 'src/endpoints/ApiServices';

const classify = (string) => {
  const elementType = string.replace(/([-_]\w)/g, g => g[1].toUpperCase());
  return elementType.charAt(0).toUpperCase() + elementType.slice(1);
};
const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export default class CommentFetcher {
  static fetchById(commentId) {
    return fetch(CommentManagementServices.COMMENT_BY_ID(commentId), {
      credentials: 'same-origin'
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static fetchByCommentableId(commentableId, commentableType) {
    return fetch(CommentManagementServices.COMMENT_BY_COMMENTABLE(
      commentableId, classify(commentableType)), {
      credentials: 'same-origin',
    }).then(response => response.json())
      .then(json => json.comments.map(comment => new Comment(comment)))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static create(prms) {
    const params = { ...prms };
    if (prms.commentable_type) {
      params.commentable_type = classify(prms.commentable_type);
    }
    return fetch(CommentManagementServices.CREATE_COMMENT, {
      credentials: 'same-origin',
      method: 'post',
      headers,
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => new Comment(json.comment))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static updateComment(comment, params) {
    return fetch(CommentManagementServices.UPDATE_COMMENT(comment), {
      credentials: 'same-origin',
      method: 'put',
      headers,
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => new Comment(json.comment))
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static delete(comment) {
    return fetch(CommentManagementServices.DELETE_COMMENT(comment), {
      credentials: 'same-origin',
      method: 'delete',
      headers
    }).then(response => response.json())
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}

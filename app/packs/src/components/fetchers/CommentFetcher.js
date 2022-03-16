import axios from 'axios';
import { CommentManagementServices } from '../../endpoints/ApiServices';

const classify = (string) => {
  const elementType = string.replace(/([-_]\w)/g, g => g[1].toUpperCase());
  return elementType.charAt(0).toUpperCase() + elementType.slice(1);
};

export default class CommentFetcher {
  static async fetchById(commentId) {
    return axios.get(CommentManagementServices.COMMENT_BY_ID(commentId))
      .then(resp => resp.data.comment)
      .catch((error) => {
        console.log(error);
      });
  }

  static async fetchByCommentableId(commentableId, commentableType) {
    return axios.get(CommentManagementServices.COMMENT_BY_COMMENTABLE(
      commentableId,
      classify(commentableType)
    )).then(resp => resp.data.comment).catch((error) => {
      console.log(error);
    });
  }

  static async create(prms) {
    const params = { ...prms };
    if (prms.commentable_type) {
      params.commentable_type = classify(prms.commentable_type);
    }
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    return axios.post(CommentManagementServices.CREATE_COMMENT, params, { headers })
      .then((resp => resp.data.comment))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static async updateComment(comment, params) {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    return axios.put(CommentManagementServices.UPDATE_COMMENT(comment), params, { headers })
      .then((resp => resp.data.comment))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static async delete(comment) {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    return axios.delete(CommentManagementServices.DELETE_COMMENT(comment), { headers })
      .then((resp => resp.data.comment))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}

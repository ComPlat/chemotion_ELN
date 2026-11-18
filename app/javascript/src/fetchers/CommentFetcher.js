import ApiClient from 'src/api_clients/ChemotionApiClient';
import Comment from 'src/models/Comment';
import { classifyString } from 'src/utilities/FetcherHelper';

export default class CommentFetcher {
  static fetchById(commentId) {
    return ApiClient.getJson(`/api/v1/comments/${commentId}`);
  }

  static fetchByCommentableId(commentableId, commentableType) {
    const searchTerm = {
      commentable_id: commentableId,
      commentable_type: classifyString(commentableType)
    };

    return ApiClient.getJson(`/api/v1/comments?${new URLSearchParams(searchTerm)}`)
      .then((json) => json.comments.map((comment) => new Comment(comment)));
  }

  static create(params) {
    const body = { ...params };
    if (params.commentable_type) {
      body.commentable_type = classifyString(params.commentable_type);
    }
    return ApiClient.postJson('/api/v1/comments', { body })
      .then((json) => new Comment(json.comment));
  }

  static updateComment(comment, params) {
    return ApiClient.putJson(`/api/v1/comments/${comment.id}`, { body: params })
      .then((json) => new Comment(json.comment));
  }

  static delete(comment) {
    return ApiClient.deleteRequest(`/api/v1/comments/${comment.id}`);
  }
}

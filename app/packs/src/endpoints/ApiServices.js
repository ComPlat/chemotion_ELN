const CommentManagementServices = {
  COMMENT_BY_ID: (commentId) => `/api/v1/comments/${commentId}.json`,
  COMMENT_BY_COMMENTABLE: (commentableId, commentableType) => `/api/v1/comments?commentable_id=${commentableId}&commentable_type=${commentableType}`,
  CREATE_COMMENT: '/api/v1/comments/create',
  UPDATE_COMMENT: (comment) => `/api/v1/comments/${comment.id}`,
  DELETE_COMMENT: (comment) => `/api/v1/comments/${comment.id}`,
};

export default CommentManagementServices;

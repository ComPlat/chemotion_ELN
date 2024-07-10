const CommentManagementServices = {
  COMMENT_BY_ID: (commentId) => `/api/v1/comments/${commentId}.json`,
  COMMENT_BY_COMMENTABLE: (commentableId, commentableType) => `/api/v1/comments?commentable_id=${commentableId}&commentable_type=${commentableType}`,
  CREATE_COMMENT: '/api/v1/comments',
  UPDATE_COMMENT: (comment) => `/api/v1/comments/${comment.id}`,
  DELETE_COMMENT: (comment) => `/api/v1/comments/${comment.id}`,
};

// path of the chemspectra data type file
const SPECTRA_DATA_TYPE = '/data_type.json';

const ThirdPartyAppServices = {
  TPA_ENDPOINT: '/api/v1/third_party_apps',
};

export {
  CommentManagementServices,
  SPECTRA_DATA_TYPE,
  ThirdPartyAppServices,
};

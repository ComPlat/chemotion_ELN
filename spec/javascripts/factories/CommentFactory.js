import Comment from 'src/models/Comment';

class CommentFactory {
  static createComment(content, userId, sampleId) {
    const comment = new Comment();
    comment.commentable_id = sampleId;
    comment.commentable_type = 'Sample';
    comment.content = content;
    comment.created_by = userId;
    comment.section = 'sample_properties';
    comment.status = 'Pending';
    return comment;
  }
}

export default CommentFactory;

import Element from './Element';

export default class PrivateNote extends Element {
  static buildEmpty() {
    return new PrivateNote({
      content: '',
      commentable_id: null,
      commentable_type: null,
      created_by: null,
      created_at: null,
    });
  }

  get content() {
    return this._content;
  }

  set content(content) {
    this._content = content;
  }

  get commentable_id() {
    return this._commentable_id;``
  }

  set commentable_id(commentable_id) {
    this._commentable_id = commentable_id;
  }

  get created_by() {
    return this._created_by;
  }
  set created_by(created_by) {
    this._created_by = created_by;
  }

  get noteable_type() {
    return this._noteable_type;
  }

  set noteable_type(noteable_type) {
    this._noteable_type = noteable_type;
  }

  serialize() {
    return super.serialize({
      content: this.content,
      commentable_id: this.commentable_id,
      noteable_type: this.noteable_type,
      created_by: this.created_by,
    });
  }
}

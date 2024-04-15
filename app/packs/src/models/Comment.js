/* eslint-disable no-underscore-dangle,  camelcase, semi,  no-unused-vars */
import Element from 'src/models/Element';

export default class Comment extends Element {
  static buildEmpty() {
    return new Comment({
      content: '',
      commentable_id: null,
      commentable_type: null,
      created_by: null,
      created_at: null,
    });
  }

  static buildWithElement(element) {}

  get content() {
    return this._content;
  }

  set content(content) {
    this._content = content;
  }

  get commentable_id() {
    return this._commentable_id;
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

  get commentable_type() {
    return this._commentable_type;
  }

  set commentable_type(commentable_type) {
    this._commentable_type = commentable_type;
  }

  get status() {
    return this._status;
  }

  set status(status) {
    this._status = status;
  }

  get submitter() {
    return this._submitter;
  }

  set submitter(submitter) {
    this._submitter = submitter;
  }

  get resolver_name() {
    return this._resolver_name;
  }

  set resolver_name(resolver_name) {
    this._resolver_name = resolver_name;
  }

  get section() {
    return this._section;
  }

  set section(section) {
    this._section = section;
  }

  serialize() {
    return super.serialize({
      content: this.content,
      commentable_id: this.commentable_id,
      commentable_type: this.commentable_type,
      created_by: this.created_by,
      status: this.status,
      submitter: this.submitter,
      resolver_name: this.resolver_name,
      section: this.section,
    });
  }
}

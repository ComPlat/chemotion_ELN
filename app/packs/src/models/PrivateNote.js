/* eslint-disable no-underscore-dangle,  camelcase, semi,  no-unused-vars */
import Element from 'src/models/Element';

export default class PrivateNote extends Element {
  static buildEmpty() {
    return new PrivateNote({
      content: '',
      noteable_id: null,
      noteable_type: null,
      created_by: null,
      created_at: null,
    });
  }

  static buildWithElement(element) {

  }

  get content() {
    return this._content;
  }

  set content(content) {
    this._content = content;
  }

  get noteable_id() {
    return this._noteable_id;
  }

  set noteable_id(noteable_id) {
    this._noteable_id = noteable_id;
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
      noteable_id: this.noteable_id,
      noteable_type: this.noteable_type,
      created_by: this.created_by
    })
  }
}

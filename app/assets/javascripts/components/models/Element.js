import uuid from 'uuid';
import sha256 from 'sha256';
import _ from 'lodash';

export default class Element {

  constructor(args) {
    Object.assign(this, args);
    if(!this.id) {
      this.id = Element.buildID();
      this._new = true
    }
    this.updateChecksum();
  }

  static buildID() {
    return uuid.v1();
  }

  get isEdited() {
    return this._checksum != this.checksum();
  }

  checksum() {
    return sha256(JSON.stringify(_.omit(_.omit(this, '_checksum'), _.isEmpty)));
  }

  get isNew() {
    return this._new == true
  }

  updateChecksum() {
    this._checksum = this.checksum();
  }

  buildCopy() {
    return new this.constructor(_.omit(this, 'id'))
  }

  // methods regarding sharing and detail levels
  isRestricted() {
    return this.is_restricted;
  }

  // base serializer
  serialize( extra_params = {} ) {
    let params = {
      id: this.id,
      type: this.type,
      is_new: this.isNew || false,
      collection_id: this.collection_id
    }
    _.merge(params, extra_params);
    let clean_params = _.omit(params, _.isNull);
    return clean_params;
  }
}

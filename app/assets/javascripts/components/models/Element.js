import uuid from 'uuid';
import sha256 from 'sha256';
import _ from 'lodash';

export default class Element {

  constructor(args) {
    Object.assign(this, args);
    if(!this.id) {
      this.id = Element.buildID();
      this.is_new = true
    }
    this.updateChecksum();
  }

  isMethodDisabled(m) {
    return this[m] == '***'
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
    return this.is_new == true
  }

  get isPendingToSave() {
    return !_.isEmpty(this) && (this.isNew || this.isEdited);
  }

  updateChecksum() {
    this._checksum = this.checksum();
  }

  buildCopy() {
    return new this.constructor(_.omit(this, 'id'))
  }

  clone() {
    return new this.constructor(this);
  }

  // methods regarding sharing and detail levels
  isRestricted() {
    return this.is_restricted;
  }

  title() {
    return this.name;
  }

  // base serializer
  serialize(extraParams = {}) {
    let params = {
      id: this.id,
      type: this.type,
      is_new: this.isNew || false,
      collection_id: this.collection_id
    }
    _.merge(params, extraParams);
    let paramsWithoutNullEntries = _.omit(params, _.isNull);
    let cleanParams = _.omit(paramsWithoutNullEntries, (x) => { return x == '***'})
    return cleanParams;
  }
}

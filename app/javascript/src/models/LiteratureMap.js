import uuid from 'uuid';
import sha256 from 'sha256';
import _ from 'lodash';
import Immutable from 'immutable';

export default class LiteratureMap {

  constructor(args) {
    Object.assign(this, args);
    if(!this.id) {
      this.id = LiteratureMap.buildID();
      this.is_new = true
      this.type = 'literature_map'
    }
    this.updateChecksum();
  }

  static buildEmpty() {
    return new LiteratureMap({
      collectionRefs: Immutable.List(),
      sampleRefs: Immutable.List(),
      reactionRefs: Immutable.List(),
      researchPlanRefs: Immutable.List(),
      selectedRefs: Immutable.List(),
      collection_id: null,
      is_sync: false
    });
  }

  static buildID() {
    return uuid.v1();
  }

  get isEdited() {
    return this._checksum != this.checksum();
  }

  checksum(fieldsToOmit = []) {
    return sha256(JSON.stringify(_.omit(_.omit(this,
      ['_checksum', ...fieldsToOmit],
    ), _.isEmpty)));
  }

  get getChecksum() {
    return this._checksum
  }

  get isNew() {
    return this.is_new === true
  }

  get isPendingToSave() {
    return !_.isEmpty(this) && (this.isNew || this.isEdited);
  }

  title() {
    return 'Literature';
  }

  updateChecksum(cs) {
    if (cs) {
      this._checksum = cs
    } else {
      this._checksum = this.checksum();
    }
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

  // base serializer
  serialize(extraParams = {}) {
    const params = {
      id: this.id,
      type: this.type,
      is_new: this.isNew || false,
      collection_id: this.collection_id
    };
    _.merge(params, extraParams);
    const paramsWithoutNullEntries = _.omit(params, _.isNull);
    const cleanParams = _.omit(paramsWithoutNullEntries, x => (x === '***'));
    return cleanParams;
  }

  // Default empty quill-delta
  static quillDefault() {
    return { "ops": [{ "insert": "" }] }
  }
}

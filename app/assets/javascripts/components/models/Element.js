import sha256 from 'sha256';
import _ from 'lodash';

export default class Element {

  constructor(args) {
    Object.assign(this, args);
    this.updateChecksum();
  }

  get isEdited() {
    return this._checksum != this.checksum();
  }

  checksum() {
    return sha256(JSON.stringify(_.omit(_.omit(this, '_checksum'), _.isEmpty)));
  }

  get isNew() {
    return this.id == '_new_'
  }

  updateChecksum() {
    this._checksum = this.checksum();
  }

}

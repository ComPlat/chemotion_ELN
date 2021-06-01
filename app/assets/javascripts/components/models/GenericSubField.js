import uuid from 'uuid';

export default class GenericSubField {
  constructor(args) {
    Object.assign(this, args);
    if (!this.id) { this.id = GenericSubField.buildID(); }
  }

  static buildID() { return uuid.v1(); }
}

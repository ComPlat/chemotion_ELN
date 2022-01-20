/* eslint-disable no-underscore-dangle */
import uuid from 'uuid';
import StructureDef from './StructureDef';

export default class StructureEditor {
  constructor(args) {
    Object.assign(this, args);
    if (!this.id) {
      this.id = StructureEditor.buildID();
    }
    this.structureDef = this.buildStructureDef();
  }

  static buildID() {
    return uuid.v1();
  }

  get structureDef() {
    return this._structureDef;
  }

  set structureDef(structureDef) {
    this._structureDef = structureDef;
  }

  buildStructureDef() {
    return new StructureDef({ id: this.id, path: this.path, ...this.structure });
  }
}
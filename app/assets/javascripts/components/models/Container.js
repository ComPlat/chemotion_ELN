import Element from './Element';
import Dataset from './Dataset';
import Attachment from './Attachment';
import _ from 'lodash';

export default class Container extends Element {
  static buildEmpty() {
    return new Container({
      name: 'new Container',
      children: [],
      attachments: [],
      is_deleted: false,
      description: '',
      extended_metadata: {},
    })
  }

  static buildRoot() {
    return new Container({
      name: 'root',
      children: [],
      attachments: [],
      is_deleted: false,
      descrption: '',
      extended_metadata: {},
    })
  }

  name() {
    return this.name;
  }

//  set name(name) {
//    this._name = name;
//  }

  children() {
    return this.children;
  }

  //set children(children) {
  //    this._children = children;
  //}

  attachments() {
    return this.attachments;
  }

  //set attachments(attachments) {
  //    this.attachments = attachments.map(a => new Attachment(a));;
  //}

  serialize() {
    return super.serialize({
      id: this.id,
      name: this.name,
      children: this.children,
      attachments: this.attachments.map(a => a.serialize()),
      is_new: this.isNew || false,
      is_deleted: this.deleted,
      description: this.description,
      extended_metadata: this.extended_metadata,
    })
  }

}

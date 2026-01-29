import { createElement } from 'chem-generic-ui';
import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';
import Segment from 'src/models/Segment';
import Wellplate from 'src/models/Wellplate';

// Create GenericEl class
const GenericElement = createElement(Element, Container, Segment);

export default class GenericEl extends GenericElement {
  static buildEmpty(collectionId, klass) {
    const { currentUser } = UserStore.getState();
    const element = super.buildEmpty(collectionId, klass, currentUser);
    element.wellplates = [];
    return element;
  }

  static buildNewShortLabel(klass) {
    const { currentUser } = UserStore.getState();
    return super.buildNewShortLabel(klass, currentUser);
  }

  buildCopy(params = {}) {
    const { currentUser } = UserStore.getState();
    return super.buildCopy(params, currentUser);
  }

  static copyFromCollectionId(element, collectionId) {
    const { currentUser } = UserStore.getState();
    return super.copyFromCollectionId(element, collectionId, currentUser);
  }

  set wellplates(wellplates) {
    this._wellplates = (wellplates && wellplates.map((w) => new Wellplate(w))) || [];
  }

  get wellplates() {
    return this._wellplates || [];
  }

  get wellplateIDs() {
    return this.wellplates.map((wp) => wp.id);
  }
}

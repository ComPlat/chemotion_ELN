import { createElement } from 'chem-generic-ui';
import Element from 'src/models/Element';
import Container from 'src/models/Container';
import { rootStore } from 'src/stores/mobx/RootStore';
import Segment from 'src/models/Segment';
import Wellplate from 'src/models/Wellplate';

// Create GenericEl class
const GenericElement = createElement(Element, Container, Segment);

export default class GenericEl extends GenericElement {
  static buildEmpty(collectionId, klass) {
    const { currentUser } = rootStore.userStore;
    const element = super.buildEmpty(collectionId, klass, currentUser);
    element.wellplates = [];
    return element;
  }

  static buildNewShortLabel(klass) {
    const { currentUser } = rootStore.userStore;
    return super.buildNewShortLabel(klass, currentUser);
  }

  static copyFromCollectionId(element, collectionId) {
    const { currentUser } = rootStore.userStore;
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

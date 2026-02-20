import { createElement } from 'chem-generic-ui';
import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';
import Segment from 'src/models/Segment';

// Create GenericEl class
const GenericElement = createElement(Element, Container, Segment);

export default class GenericEl extends GenericElement {
  static buildEmpty(collectionId, klass) {
    const { currentUser } = UserStore.getState();
    return super.buildEmpty(collectionId, klass, currentUser);
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
}

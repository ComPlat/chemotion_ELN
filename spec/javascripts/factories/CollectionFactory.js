import Collection from 'src/models/Collection';
import { faker } from '@faker-js/faker';

export default class CollectionFactory {
  constructor(args) {
    Object.assign(this, args);
  }

  static build(label, args) {
    return this[label](args);
  }

  static instantiate(args) {
    return new Collection(args);
  }

  static basic(args = {}) {
    const userId = faker.number.int();
    return this.instantiate({
      label: faker.lorem.word(2),
      id: faker.number.int(),
      is_locked: false,
      user_id: userId,
      collection_acls: [],
      currentUser: { id: userId },
      ancestry: null,
      ...args
    });
  }

  static dummy(args = {}) {
    return this.basic({    
      ...args
    });
  }

  static All() {
    return this.basic({
      label: 'All',
      is_locked: true,
      position: 0
    });
  }

  static Chemotion() {
    return this.basic({
      label: 'chemotion-repository.net',
      is_locked: true,
      position: 1
    });
  }

  static lockedCollections(args = {}) {
    return ([
      this.All(),
      this.Chemotion(),
    ]);
  }

  static sharedWithRead(args = {}) {
    return this.dummy({
      label: 'Shared',
      user_id: 2,
      collection_acls: [{ user_id: 1, permission_level: 0 }],
      currentUser: { id: 1 },
      ...args
    });
  }

  static sharedWithWrite(args = {}) {
    return this.sharedWithRead({
      collection_acls: [{ user_id: 1, permission_level: 1 }],
      ...args
    });
  }
}

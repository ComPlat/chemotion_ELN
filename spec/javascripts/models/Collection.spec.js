import expect from 'expect';
import CollectionFactory from '../factories/CollectionFactory';

describe('Collection', () => {
  describe('allCollection', () => {
    it('should return true if the collection is All', () => {
      const collection = CollectionFactory.build('All');
      expect(collection.allCollection()).toEqual(true);
    });
    it('should return false if the collection is not All', () => {
      const collection = CollectionFactory.build('dummy');
      expect(collection.allCollection()).toEqual(false);
    });
  });
  describe('sharedWithMe', () => {
    it('should return true if the collection is shared with the current user', () => {
      const collection = CollectionFactory.build('sharedWithRead');
      expect(collection.sharedWithMe()).toEqual(true);
    });
    it('should return false if the collection is not shared with the current user', () => {
      const collection = CollectionFactory.build('dummy');
      expect(collection.sharedWithMe()).toEqual(false);
    });
  });
  describe('ownedByMe', () => {
    it('should return true if the collection is owned by the current user', () => {
      const collection = CollectionFactory.build('dummy');
      expect(collection.ownedByMe()).toEqual(true);
    });
    it('should return false if the collection is not owned by the current user', () => {
      const collection = CollectionFactory.build('sharedWithRead');
      expect(collection.ownedByMe()).toEqual(false);
    });
  });
  describe('ownedByMeAndNotAll', () => {
    it('should return true if the collection is owned by the current user and not All', () => {
      const collection = CollectionFactory.build('dummy');
      expect(collection.ownedByMeAndNotAll()).toEqual(true);
    });
    it('should return false if the collection is not owned by the current user', () => {
      const collection = CollectionFactory.build('sharedWithRead');
      expect(collection.ownedByMeAndNotAll()).toEqual(false);
    });
    it('should return false if the collection is All', () => {
      const collection = CollectionFactory.build('All');
      expect(collection.ownedByMeAndNotAll()).toEqual(false);
    });
  });
  describe('defCol', () => {
    it('should return the id if the collection is owned by the current user and not All', () => {
      const collection = CollectionFactory.build('dummy');
      expect(collection.defCol()).toEqual(collection.id);
    });
    it('should return null if the collection is not owned by the current user', () => {
      const collection = CollectionFactory.build('sharedWithRead');
      expect(collection.defCol()).toEqual(null);
    });
    it('should return null if the collection is All', () => {
      const collection = CollectionFactory.build('All');
      expect(collection.defCol()).toEqual(null);
    });
  });
  describe('hasAclWrite', () => {
    it('should return true if the collection is shared with the current user and has write permission', () => {
      const collection = CollectionFactory.build('sharedWithWrite');
      expect(collection.hasAclWrite()).toEqual(true);
    });
    it('should return false if the collection is shared with the current user but has read permission', () => {
      const collection = CollectionFactory.build('sharedWithRead');
      expect(collection.hasAclWrite()).toEqual(false);
    });
  });
  describe('canCreateElement', () => {
    it('should return true if the collection is owned by the current user', () => {
      const collection = CollectionFactory.build('dummy');
      expect(collection.canCreateElement()).toEqual(true);
    });
    it('should return true if the collection is shared with the current user and has write permission', () => {
      const collection = CollectionFactory.build('sharedWithWrite');
      expect(collection.canCreateElement()).toEqual(true);
    });
    it('should return false if the collection is shared with the current user but has read permission', () => {
      const collection = CollectionFactory.build('sharedWithRead');
      expect(collection.canCreateElement()).toEqual(false);
    });
  });
});
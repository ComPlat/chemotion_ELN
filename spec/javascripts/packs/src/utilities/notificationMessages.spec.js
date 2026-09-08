// eslint-disable-next-line import/no-unresolved
import {
  sampleAssociationLockNotification,
  sampleAssociationMoveNotification,
} from 'src/utilities/notificationMessages';
import expect from 'expect';

describe('notificationMessages', () => {
  describe('.sampleAssociationLockNotification', () => {
    it('uses singular copy for a single locked sample', () => {
      const notification = sampleAssociationLockNotification(1);

      expect(notification.title).toBe('Sample not removed');
      expect(notification.message).toMatch(/^It belongs to a reaction or wellplate/);
      expect(notification.level).toBe('warning');
      expect(notification.position).toBe('tr');
    });

    it('uses plural copy for more than one locked sample', () => {
      const notification = sampleAssociationLockNotification(3);

      expect(notification.title).toBe('Samples not removed');
      expect(notification.message).toMatch(/^They belong to a reaction or wellplate/);
    });

    it('defaults to singular copy', () => {
      expect(sampleAssociationLockNotification().title).toBe('Sample not removed');
    });
  });

  describe('.sampleAssociationMoveNotification', () => {
    // Guards against the move-path toast drifting from the shared presentation: it must stay a
    // top-right warning like the remove/delete toast so related warnings appear in the same corner.
    it('is a top-right warning titled for the move', () => {
      const notification = sampleAssociationMoveNotification();

      expect(notification.title).toBe('Move incomplete');
      expect(notification.message).toMatch(/reaction or wellplate/);
      expect(notification.level).toBe('warning');
      expect(notification.position).toBe('tr');
    });
  });
});

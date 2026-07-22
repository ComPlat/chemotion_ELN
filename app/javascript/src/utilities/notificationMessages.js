// Notification payloads for the "sample locked by a reaction/wellplate" cases. Kept in a
// dependency-free module (no imports) so the stores/actions that display them — CollectionsStore
// (MobX) and ElementActions (alt) — can import without creating an import cycle: collectionUtilities
// transitively pulls in the MobX root store, which imports CollectionsStore back.

// Shown when a sample cannot be removed/deleted on its own because it belongs to a reaction or
// wellplate. Used for both "Remove from current Collection" (unshare) and "Remove from all
// Collections" (delete). The copy is deliberately scope-neutral — it does NOT say "this collection"
// — because the two paths evaluate the lock against different scopes: the remove path against the
// current collection, the withdraw path across all of the user's collections. Pass the locked-id
// count so singular/plural copy matches.
const sampleAssociationLockNotification = (lockedCount = 1) => {
  const plural = lockedCount > 1;
  return {
    title: plural ? 'Samples not removed' : 'Sample not removed',
    message: plural
      ? 'They belong to a reaction or wellplate. Remove the reaction or wellplate to remove its associated samples.'
      : 'It belongs to a reaction or wellplate. Remove the reaction or wellplate to remove its associated samples.',
    level: 'warning',
    autoDismiss: 10,
    position: 'tr',
  };
};

// Move-path variant of the above: samples locked by a reaction/wellplate are copied to the target
// but cannot leave the source, so the move is only partial. Kept beside the remove/delete copy so
// the two related warnings stay presentationally consistent (both warning, top-right).
const sampleAssociationMoveNotification = () => ({
  title: 'Move incomplete',
  message: 'Some samples stayed here - they belong to a reaction or wellplate. '
    + 'Move the reaction or wellplate to move its associated samples.',
  level: 'warning',
  autoDismiss: 10,
  position: 'tr',
});

export { sampleAssociationLockNotification, sampleAssociationMoveNotification };

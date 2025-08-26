function isReadOnly(collection, userId, isSync = false) {
  if (collection.permission_level > 0) { return false; }

  const isShared = collection.is_shared
    && collection.shared_by_id !== userId;

  return isShared;
}

function isWritable(collection) {
  return collection.permission_level >= 1;
}

export default {
  isReadOnly,
  isWritable,
};

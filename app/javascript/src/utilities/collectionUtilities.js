import { allElnElements } from 'src/apps/generic/Utils';
import { PermissionConst } from 'src/utilities/PermissionConst';

// Shown when a sample cannot be removed from a collection or deleted on its own
// because it belongs to a reaction that is also in the collection. Used for both
// the "Remove from current Collection" (unshare) and "Remove from all Collections"
// (delete) actions so the wording stays identical for both scenarios.
const SAMPLE_REACTION_LOCK_NOTIFICATION = {
  title: 'Sample linked to a reaction',
  message: 'This sample is part of a reaction and cannot be removed on its own. '
    + 'Remove the reaction to remove its associated samples.',
  level: 'warning',
  autoDismiss: 10,
};

const isElementSelectionEmpty = (element) => !element.checkedAll
    && element.checkedIds.size === 0
    && element.uncheckedIds.size === 0;

const filterParamsFromUIState = (uiState) => {
  const collectionId = uiState.currentCollection.id;
  // currentSearchSelection: uiState.currentSearchSelection,

  const filterParams = {
    currentCollection: { id: collectionId },
  };

  // Built-in ELN element types plus the generic (labimotion) klass names, which UIStore keeps in
  // `klasses`. Both are collected synchronously here: the previous version added the generic keys
  // inside an un-awaited `elementNames(false).then(...)` callback that resolved *after* this
  // function had already returned, so generic-element selections were silently dropped from every
  // consumer (Move / Assign / Remove / Share).
  const elementTypes = [...allElnElements, ...(uiState.klasses || [])];

  elementTypes.forEach((element) => {
    if (uiState[element] === undefined || isElementSelectionEmpty(uiState[element])) { return; }

    filterParams[element] = {
      all: uiState[element].checkedAll,
      included_ids: uiState[element].checkedIds,
      excluded_ids: uiState[element].uncheckedIds,
      collection_id: collectionId,
    };
  });

  return filterParams;
};

const makeList = (collections, tree = [], depth = 0) => {
  if (!Array.isArray(collections)) return tree;

  collections.forEach((collection) => {
    tree.push(collection);
    makeList(collection.children, tree, depth + 1);
  });

  return tree;
};

const collectionOptions = (store, showSharedCollections) => {
  const ownCollections = store.own_collections;
  let shared = [];
  if (showSharedCollections) {
    const sharedWithMeCollections = store.shared_with_me_collections;
    // Only offer shared collections the user may actually assign elements into.
    shared = sharedWithMeCollections
      .flatMap((c) => c.children)
      .filter((c) => c.permission_level >= PermissionConst.AddElements);
  }

  return [
    ...makeList(ownCollections),
    {
      label: 'Shared with me collections',
      options: makeList(shared),
    },
  ];
};

const collectionHasPermission = (collection, permissionLevel) => {
  if (!collection || collection.permission_level === undefined) { return true; }

  return collection.collection_share_id && collection.permission_level >= permissionLevel;
};

export {
  isElementSelectionEmpty, filterParamsFromUIState, collectionOptions, collectionHasPermission,
  SAMPLE_REACTION_LOCK_NOTIFICATION
};

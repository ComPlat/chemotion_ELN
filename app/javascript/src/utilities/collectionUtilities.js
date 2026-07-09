import { elementNames, allElnElements } from 'src/apps/generic/Utils';
import { PermissionConst } from 'src/utilities/PermissionConst';

const isElementSelectionEmpty = (element) => !element.checkedAll
    && element.checkedIds.size === 0
    && element.uncheckedIds.size === 0;

const filterParamsFromUIState = (uiState) => {
  const collectionId = uiState.currentCollection.id;
  // currentSearchSelection: uiState.currentSearchSelection,

  const filterParams = {
    currentCollection: { id: collectionId },
  };

  allElnElements.map((element) => {
    if (uiState[element] === undefined || isElementSelectionEmpty(uiState[element])) { return; }

    filterParams[element] = {
      all: uiState[element].checkedAll,
      included_ids: uiState[element].checkedIds,
      excluded_ids: uiState[element].uncheckedIds,
      collection_id: collectionId,
    };
  });

  elementNames(false).then((klassArray) => {
    klassArray.forEach((klass) => {
      if (isElementSelectionEmpty(uiState[`${klass}`])) { return; }

      filterParams[`${klass}`] = {
        all: uiState[`${klass}`].checkedAll,
        included_ids: uiState[`${klass}`].checkedIds,
        excluded_ids: uiState[`${klass}`].uncheckedIds,
        collection_id: collectionId
      };
    });
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
  isElementSelectionEmpty, filterParamsFromUIState, collectionOptions, collectionHasPermission
};

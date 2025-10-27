import { elementNames, allElnElements } from 'src/apps/generic/Utils';

const isElementSelectionEmpty = (element) => {
  return !element.checkedAll &&
    element.checkedIds.size == 0 &&
    element.uncheckedIds.size == 0;
}

const filterParamsFromUIState = (uiState) => {
  let collectionId = uiState.currentCollection.id;
  // currentSearchSelection: uiState.currentSearchSelection,

  let filterParams = {
    currentCollection: { id: collectionId },
  };

  allElnElements.map((element) => {
    if (uiState[element] === undefined || isElementSelectionEmpty(uiState[element])) { return }

    filterParams[element] = {
      all: uiState[element].checkedAll,
      included_ids: uiState[element].checkedIds,
      excluded_ids: uiState[element].uncheckedIds,
      collection_id: collectionId,
    };
  });

  elementNames(false).then((klassArray) => {
    klassArray.forEach((klass) => {
      if (isElementSelectionEmpty(uiState[`${klass}`])) { return }

      filterParams[`${klass}`] = {
        all: uiState[`${klass}`].checkedAll,
        included_ids: uiState[`${klass}`].checkedIds,
        excluded_ids: uiState[`${klass}`].uncheckedIds,
        collection_id: collectionId
      };
    });
  });

  return filterParams;
}

const makeList = (collections, tree = [], depth = 0) => {
  if (!Array.isArray(collections)) return tree;

  collections.forEach((collection) => {
    tree.push(collection);
    makeList(collection.children, tree, depth + 1);
  });

  return tree;
}

const collectionOptions = (store, showSharedCollections) => {
  const ownCollections = store.own_collections;
  let shared = [];
  if (showSharedCollections) {
    const sharedWithMeCollections = store.shared_with_me_collections;
    shared = sharedWithMeCollections.flatMap((c) => c.children).filter((c) => c.permission_level >= 1)
  }

  return [
    ...makeList(ownCollections),
    {
      label: 'Shared with me collections',
      options: makeList(shared),
    },
  ];
}

export { isElementSelectionEmpty, filterParamsFromUIState, collectionOptions }
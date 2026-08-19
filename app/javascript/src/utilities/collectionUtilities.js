import { allElnElements } from 'src/apps/generic/Utils';
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

// Flatten the collection tree into a pre-order list (parent immediately followed by its
// descendants). The nesting depth is stamped onto each pushed option so the dropdown can indent
// child collections. react-select passes the option object straight to `formatOptionLabel`, so a
// depth that only lived in this closure could never reach the renderer.
const makeList = (collections, tree = [], depth = 0) => {
  if (!Array.isArray(collections)) return tree;

  collections.forEach(({ children, ...rest }) => {
    tree.push({ ...rest, depth });
    makeList(children, tree, depth + 1);
  });

  return tree;
};

const collectionOptions = (store, showSharedCollections, includeRepository = false) => {
  // Label the owned collections as their own react-select group so it sits parallel to the shared
  // groups below, rather than as an unlabelled block of top-level options.
  const groups = [
    {
      label: 'My Collections',
      options: makeList(store.own_collections),
    },
  ];

  if (showSharedCollections) {
    // Keep one group per owner (the "shared by <user>" level) so a user with shares from several
    // people can tell them apart, instead of flattening every owner's collections together.
    store.shared_with_me_collections.forEach((owner) => {
      // Only offer shared collections the user may actually assign elements into.
      const assignable = owner.children
        .filter((c) => c.permission_level >= PermissionConst.AddElements);
      if (assignable.length === 0) return;

      groups.push({
        label: `Shared by ${owner.label}`,
        options: makeList(assignable),
      });
    });
  }

  // Opt-in per call site: the repository root and the "transferred" node under it are valid targets
  // for moving/assigning elements, but not for the other CollectionSelect consumers (picking a parent
  // for a new shared collection, copying an element). "All" is never offered — every element is in it
  // already, so assigning to it is a no-op and moving to it is a removal in disguise.
  if (includeRepository && store.chemotion_repository_collection) {
    groups.push({
      label: 'chemotion-repo',
      options: makeList([store.chemotion_repository_collection]),
    });
  }

  return groups;
};

const collectionHasPermission = (collection, permissionLevel) => {
  if (!collection || collection.permission_level === undefined) { return true; }

  return collection.collection_share_id && collection.permission_level >= permissionLevel;
};

export {
  isElementSelectionEmpty, filterParamsFromUIState, collectionOptions, collectionHasPermission
};

/* eslint-disable react/destructuring-assignment */
/* eslint-disable camelcase */
import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  Button, Dropdown
} from 'react-bootstrap';
import UserStore from 'src/stores/alt/stores/UserStore';
import PermissionIcons from 'src/apps/mydb/collections/PermissionIcons';
import { aviatorNavigationWithCollectionId } from 'src/utilities/routesUtils';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

// Warning texts for the two distinguishable dual-ownership cases. Both use the same glyph —
// what differs is whether the other collection is one the viewer can actually reach.
const DUAL_OWNED_REACHABLE = 'Also shared with you elsewhere';
const DUAL_OWNED_UNREACHABLE = "Also present in a collection you can't access";

// Both share directions use `fa-share-alt`, matching the rest of the app: the collection sidebar
// already marks an own collection the viewer shared out with this glyph (MyCollections.js), and a
// badge that disagreed with the tree one screen away would cost more than the local ambiguity it
// removed. The two directions are told apart by position and by the `title` on every chip, not by
// the glyph. If the app ever settles on a distinct shared-out glyph, change it here and there
// together.
const SHARED_WITH_ME_ICON = 'fa fa-share-alt';
const SHARED_OUT_ICON = 'fa fa-share-alt';

const pluralCollections = (count) => (count === 1 ? 'collection' : 'collections');

// Each chip renders only when it applies, so an element in a single own collection shows one
// count and nothing else. `sharedOutCount` is the subset of the viewer's own collections that
// they have shared out to someone — derived from `Collection.shared`, already fetched. Every chip
// spells its counts out in a `title`: the glyphs alone are not self-describing, and the button's
// own title is reserved for the dual-ownership warning.
const CollectionToggle = React.forwardRef(({
  onClick,
  ownCount,
  sharedOutCount,
  sharedCount,
  dualOwnedTitle,
  size,
  variant,
}, ref) => (
  <Button
    ref={ref}
    size={size}
    variant={variant}
    className="text-nowrap"
    title={dualOwnedTitle || undefined}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }}
  >
    {ownCount > 0 && (
      <span
        className="collection-labels-own"
        title={`In ${ownCount} of your own ${pluralCollections(ownCount)}${
          sharedOutCount > 0 ? `, ${sharedOutCount} of which you shared with others` : ''}`}
      >
        <i className="fa fa-list" />
        {` ${ownCount}`}
        {sharedOutCount > 0 && ` [${sharedOutCount}]`}
      </span>
    )}
    {sharedCount > 0 && (
      <span
        className={`collection-labels-shared${ownCount > 0 ? ' ms-1' : ''}`}
        title={`In ${sharedCount} ${pluralCollections(sharedCount)} shared with you`}
      >
        <i className={SHARED_WITH_ME_ICON} />
        {` ${sharedCount}`}
      </span>
    )}
    {dualOwnedTitle && (
      // Persistent, not color-only and not hover-only: the warning has to survive both a
      // colour-blind viewer and a touch device with no hover.
      <span className="collection-labels-dual-owned text-warning ms-1">
        <i className="fa fa-exclamation-triangle" />
      </span>
    )}
  </Button>
));
CollectionToggle.displayName = 'CollectionToggle';
CollectionToggle.propTypes = {
  onClick: PropTypes.func.isRequired,
  ownCount: PropTypes.number.isRequired,
  sharedOutCount: PropTypes.number.isRequired,
  sharedCount: PropTypes.number.isRequired,
  dualOwnedTitle: PropTypes.string,
  size: PropTypes.string,
  variant: PropTypes.string,
};
CollectionToggle.defaultProps = {
  dualOwnedTitle: null,
  size: 'xxsm',
  variant: 'light',
};

const ElementCollectionLabels = ({ element, size, variant }) => {
  const collectionsStore = useContext(StoreContext).collections;

  const { currentUser } = UserStore.getState();
  if (!currentUser) return (<span />);
  if (!element.tag) return (<span />);
  if (!element.tag.taggable_data) return (<span />);
  if (!element.tag.taggable_data.collection_labels) return (<span />);
  if (element.tag.taggable_data.collection_labels.length === 0) return (<span />);

  const handleOnClick = (label, e) => {
    e.stopPropagation();
    aviatorNavigationWithCollectionId(label.id, element.type, element.id, true, true);
  };

  // Guard against malformed entries: legacy/un-backfilled tags can contain null elements or
  // entries without a real collection id, which would otherwise throw on `label.id`.
  const validLabels = element.tag.taggable_data.collection_labels
    .filter((label) => label && label.id != null);
  // One pass, one store lookup per label. Both `isOwnCollection` and `isSharedCollection` scan a
  // computed id array, and `find` walks the collection trees, so the counts and the menu resolve
  // each label once and carry the collection along instead of re-resolving it per render helper.
  //
  // "Own" is `user_id == current_user.id` and nothing else, so this includes the viewer's own
  // repository subtree ("chemotion-repository.net" and "transferred"). Unlike the locked "All"
  // bucket — dropped server-side because it holds every element by definition and says nothing —
  // having reached the repository is a specific fact about this element, and the collection is
  // right there in the sidebar. Someone else's repository subtree is not in this store and
  // correctly stays unreachable.
  //
  // A label that resolves to no tree at all is a collection someone else owns and has not shared
  // with the viewer; only its count is kept. The ids already ship to the owner at detail level 10 —
  // this only derives a boolean from them, and never names the collection or its owner.
  const ownEntries = [];
  const sharedEntries = [];
  let unreachableCount = 0;
  validLabels.forEach((label) => {
    const isOwn = collectionsStore.isOwnCollection(label.id);
    // An id in either tree always resolves through `find`; a label that somehow does not is
    // counted as unreachable rather than inflating a chip the menu then cannot name.
    const collection = (isOwn || collectionsStore.isSharedCollection(label.id))
      ? collectionsStore.find(label.id)
      : null;
    if (!collection) { unreachableCount += 1; return; }
    (isOwn ? ownEntries : sharedEntries).push({ label, collection });
  });

  if (ownEntries.length === 0 && sharedEntries.length === 0) { return (<span />); }

  const sharedOutCount = ownEntries.filter(({ collection }) => collection.shared === true).length;

  const dualOwnedMessages = [];
  if (ownEntries.length > 0 && sharedEntries.length > 0) {
    dualOwnedMessages.push(DUAL_OWNED_REACHABLE);
  }
  if (ownEntries.length > 0 && unreachableCount > 0) {
    dualOwnedMessages.push(DUAL_OWNED_UNREACHABLE);
  }

  const renderOwnCollections = () => {
    if (ownEntries.length === 0) return null;
    return (
      <>
        <Dropdown.Header>My Collections</Dropdown.Header>
        {ownEntries.map(({ label, collection }) => (
          <Dropdown.Item key={label.id} onClick={(e) => handleOnClick(label, e)}>
            {collection.label}
            {collection.shared === true && (
              <i
                className={`${SHARED_OUT_ICON} ms-1 text-body-secondary`}
                title="You shared this collection with others"
              />
            )}
          </Dropdown.Item>
        ))}
      </>
    );
  };

  // Grouped by owner so "three collections from two people" reads as such. Keyed on `owner`
  // ("First Last (ABBR)") exactly as the store's own grouping in `setSharedWithMeCollections`: two
  // users can share a plain name, so `owner_name` alone would merge them into one group — and it is
  // also the React key here. The group is still labelled with the plain `owner_name`.
  //
  // The group name behind `shared_via_group` deliberately stays out: it needs a per-collection
  // `mySharesFor` fetch, and a dense element list would fire one per badge.
  const renderSharedCollections = () => {
    if (sharedEntries.length === 0) return null;

    const byOwner = new Map();
    sharedEntries.forEach((entry) => {
      const { collection } = entry;
      const ownerKey = collection.owner || collection.owner_name || 'Unknown owner';
      if (!byOwner.has(ownerKey)) byOwner.set(ownerKey, []);
      byOwner.get(ownerKey).push(entry);
    });

    return (
      <>
        <Dropdown.Header>Shared Collections</Dropdown.Header>
        {Array.from(byOwner.entries()).map(([ownerKey, entries]) => (
          <React.Fragment key={ownerKey}>
            <Dropdown.ItemText className="small text-body-secondary">
              {entries[0].collection.owner_name || ownerKey}
            </Dropdown.ItemText>
            {entries.map(({ label, collection }) => (
              <Dropdown.Item key={label.id} onClick={(e) => handleOnClick(label, e)}>
                <span className="me-1">{collection.label}</span>
                {collection.shared_via_group && (
                  <span className="me-1 text-body-secondary">(via group)</span>
                )}
                {collection.permission_level != null && (
                  <PermissionIcons pl={collection.permission_level} />
                )}
              </Dropdown.Item>
            ))}
          </React.Fragment>
        ))}
      </>
    );
  };

  return (
    <Dropdown>
      <Dropdown.Toggle
        as={CollectionToggle}
        id="dropdown-custom-components"
        ownCount={ownEntries.length}
        sharedOutCount={sharedOutCount}
        sharedCount={sharedEntries.length}
        dualOwnedTitle={dualOwnedMessages.join(' · ') || null}
        size={size}
        variant={variant}
      />
      {createPortal(
        <Dropdown.Menu>
          {renderOwnCollections()}
          {renderSharedCollections()}
          {dualOwnedMessages.length > 0 && (
            <>
              <Dropdown.Divider />
              {dualOwnedMessages.map((message) => (
                <Dropdown.ItemText key={message} className="small text-warning">
                  <i className="fa fa-exclamation-triangle me-1" />
                  {message}
                </Dropdown.ItemText>
              ))}
            </>
          )}
        </Dropdown.Menu>,
        document.body
      )}
    </Dropdown>
  );
};

export default observer(ElementCollectionLabels);

ElementCollectionLabels.propTypes = {
  size: PropTypes.string,
  variant: PropTypes.string,
  element: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
    tag: PropTypes.shape({
      taggable_data: PropTypes.shape({
        collection_labels: PropTypes.arrayOf(PropTypes.shape({
          id: PropTypes.number,
        })),
      }),
    }),
  }).isRequired,
};

ElementCollectionLabels.defaultProps = {
  size: 'xxsm',
  variant: 'light',
};

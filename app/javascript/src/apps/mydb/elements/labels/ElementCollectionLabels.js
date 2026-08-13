/* eslint-disable react/destructuring-assignment */
/* eslint-disable camelcase */
import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  Button, Dropdown, OverlayTrigger
} from 'react-bootstrap';
import UserStore from 'src/stores/alt/stores/UserStore';
import PermissionIcons from 'src/apps/mydb/collections/PermissionIcons';
import UserInfosTooltip from 'src/apps/mydb/collections/UserInfosTooltip';
import SharedToMeInfosTooltip from 'src/apps/mydb/collections/SharedToMeInfosTooltip';
import { aviatorNavigationWithCollectionId } from 'src/utilities/routesUtils';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

// Exactly one of these is a warning. Being co-present in a collection the viewer *can* open is
// ordinary collaboration and only earns a line in the popover; being co-present in one they
// cannot open is the thing they have no other way to discover, and is the only case that earns
// the triangle.
const COPRESENT_REACHABLE_INFO = 'Also shared with you elsewhere';
const DUAL_OWNED_UNREACHABLE = "Also present in a collection you can't access";

// Directional glyphs from the chemstrap-icons font (global-styles/icons.scss), so the two share
// directions cannot be mistaken for each other: incoming = shared to the viewer, outgoing = the
// viewer shared it out. `type-icon` carries no glyph of its own — it matches how SidebarButton
// emits these — the meaning is entirely in `icon-incoming` / `icon-outgoing`.
const SHARED_WITH_ME_ICON = 'type-icon icon-incoming';
const SHARED_OUT_ICON = 'type-icon icon-outgoing';
// The popover lists collections, one per row, the way the sidebar does — so it marks a shared-out
// one the way the sidebar does too (MyCollections.js, CollectionSubtree.js). The directional pair
// above earns its keep only in the summary chip, where the two counts sit side by side and must
// not be read as each other; in a list of rows there is nothing to confuse it with.
const SHARED_OUT_ROW_ICON = 'fa fa-share-alt';

const pluralCollections = (count) => (count === 1 ? 'collection' : 'collections');

// Each chip renders only when it applies, so an element in a single own collection shows one
// count and nothing else. `sharedOutCount` is the subset of the viewer's own collections that
// they have shared out to someone — derived from `Collection.shared`, already fetched. Every chip
// spells its counts out in a `title`: the glyphs alone are not self-describing, and the button's
// own title is reserved for the warning.
const CollectionToggle = React.forwardRef(({
  onClick,
  ownCount,
  sharedOutCount,
  sharedCount,
  warningTitle,
  size,
  variant,
}, ref) => (
  <Button
    ref={ref}
    size={size}
    variant={variant}
    className="text-nowrap"
    title={warningTitle || undefined}
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
        {` ${ownCount} `}
        {sharedOutCount > 0 && (
          <>
            <i className={`${SHARED_OUT_ICON} me-1`} />
            {`${sharedOutCount}`}
          </>
        )}
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
    {warningTitle && (
      // Persistent, not hover-only, so it survives a touch device. It takes the label's own font
      // colour here — the glyph alone carries the signal, and the popover states it in warning
      // colour with the reason spelled out.
      <span className="collection-labels-dual-owned ms-1">
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
  warningTitle: PropTypes.string,
  size: PropTypes.string,
  variant: PropTypes.string,
};
CollectionToggle.defaultProps = {
  warningTitle: null,
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

  // Ownership is the whole gate, matching ElementPolicy, which resolves every capability to "is
  // it in a collection I own" (record_is_in_own_collection?). Own a collection holding this
  // element and you are told it also sits somewhere you cannot see — whoever holds it, and
  // whether or not anyone has shared anything back. Own none of them and you are only a sharee:
  // where else it lives belongs to the people who do own it.
  //
  // Deliberately not narrowed by who holds the hidden collection. An earlier version suppressed
  // the warning whenever the viewer held any share for the element, on the theory that they had
  // arrived through someone else — but an unrelated colleague's share then masked a genuine third
  // party holding the element, which is precisely the thing the owner cannot discover any other
  // way. Telling the two apart would need the hidden collection's owner, and collection_labels
  // carries `{id}` and nothing else, so it is not knowable here. It also should not matter.
  const showUnreachableWarning = ownEntries.length > 0 && unreachableCount > 0;
  // Not a warning: both collections are open to the viewer. It earns a popover line because
  // removing the element from their own collection will not remove it from the other one.
  const showReachableInfo = ownEntries.length > 0 && sharedEntries.length > 0;

  const renderOwnCollections = () => {
    if (ownEntries.length === 0) return null;
    return (
      <>
        <Dropdown.Header>My Collections</Dropdown.Header>
        {ownEntries.map(({ label, collection }) => (
          <Dropdown.Item key={label.id} onClick={(e) => handleOnClick(label, e)}>
            {collection.label}
            {collection.shared === true && (
              // Same icon and same tooltip as the sidebar: hover names who it is shared with, and
              // at what permission. Costs nothing until then — the overlay is not mounted while
              // hidden, so its fetch does not run, and the menu's rows do not exist at all until
              // the popover is first opened. Do not add `renderOnMount` to the menu below.
              <OverlayTrigger placement="top" overlay={<UserInfosTooltip collectionId={label.id} />}>
                <i className={`${SHARED_OUT_ROW_ICON} ms-1 text-body-secondary`} />
              </OverlayTrigger>
            )}
          </Dropdown.Item>
        ))}
      </>
    );
  };

  // Grouped by owner so "three collections from two people" reads as such, and sorted by owner
  // then label: the tag array's order is arbitrary, so without this the same shares appear in a
  // different order on every element and disagree with the sidebar, which presorts by owner.
  //
  // Keyed on `owner` ("First Last (ABBR)") exactly as the store's own grouping in
  // `setSharedWithMeCollections`: two users can share a plain name, so `owner_name` alone would
  // merge them into one group — and it is also the React key here. The group is still labelled
  // with the plain `owner_name`.
  //
  // "(via group)" stays generic in the row itself — naming the group needs a per-collection
  // `mySharesFor` fetch, and a dense element list would once have fired one per badge. Hovering
  // the row lifts that: the tooltip is not mounted until then, so the fetch is per-hover, and it
  // names the group along with every other share that reaches the viewer.
  const renderSharedCollections = () => {
    if (sharedEntries.length === 0) return null;

    const byOwner = new Map();
    sharedEntries.forEach((entry) => {
      const { collection } = entry;
      const ownerKey = collection.owner || collection.owner_name || 'Unknown owner';
      if (!byOwner.has(ownerKey)) byOwner.set(ownerKey, []);
      byOwner.get(ownerKey).push(entry);
    });

    const sortedGroups = Array.from(byOwner.entries())
      .map(([ownerKey, entries]) => [
        ownerKey,
        entries.slice().sort((a, b) => a.collection.label.localeCompare(b.collection.label)),
      ])
      .sort(([, a], [, b]) => (
        (a[0].collection.owner_name || '').localeCompare(b[0].collection.owner_name || '')
      ));

    return (
      <>
        <Dropdown.Header>
          <i className={`${SHARED_WITH_ME_ICON} me-1`} />
          Shared with me by
        </Dropdown.Header>
        {sortedGroups.map(([ownerKey, entries]) => (
          <React.Fragment key={ownerKey}>
            <Dropdown.ItemText className="small text-body-secondary">
              {entries[0].collection.owner_name || ownerKey}
            </Dropdown.ItemText>
            {entries.map(({ label, collection }) => (
              <Dropdown.Item key={label.id} onClick={(e) => handleOnClick(label, e)}>
                <OverlayTrigger
                  placement="top"
                  overlay={(
                    <SharedToMeInfosTooltip
                      collectionId={label.id}
                      owner={collection.owner_name || collection.owner}
                    />
                  )}
                >
                  <span>
                    <span className="me-1">{collection.label}</span>
                    {collection.shared_via_group && (
                      <span className="me-1 text-body-secondary">(via group)</span>
                    )}
                    {collection.permission_level != null && (
                      <PermissionIcons pl={collection.permission_level} />
                    )}
                  </span>
                </OverlayTrigger>
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
        warningTitle={showUnreachableWarning ? DUAL_OWNED_UNREACHABLE : null}
        size={size}
        variant={variant}
      />
      {createPortal(
        <Dropdown.Menu>
          {renderOwnCollections()}
          {renderSharedCollections()}
          {(showUnreachableWarning || showReachableInfo) && (
            <>
              <Dropdown.Divider />
              {showUnreachableWarning && (
                <Dropdown.ItemText className="small text-warning">
                  <i className="fa fa-exclamation-triangle me-1" />
                  {DUAL_OWNED_UNREACHABLE}
                </Dropdown.ItemText>
              )}
              {showReachableInfo && (
                <Dropdown.ItemText className="small text-body-secondary">
                  {COPRESENT_REACHABLE_INFO}
                </Dropdown.ItemText>
              )}
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

/* eslint-disable react/destructuring-assignment */
/* eslint-disable camelcase */
import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  Button, Dropdown
} from 'react-bootstrap';
import UserStore from 'src/stores/alt/stores/UserStore';
import { aviatorNavigationWithCollectionId } from 'src/utilities/routesUtils';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const CollectionToggle = React.forwardRef(({
  onClick,
  labelsCount,
  totalSharedCollections,
  isDualOwned,
  size,
  variant,
}, ref) => (
  <Button
    ref={ref}
    size={size}
    variant={variant}
    className="text-nowrap"
    title={isDualOwned ? 'This element is also in a collection you do not own' : undefined}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }}
  >
    <i className="fa fa-list" />
    {` ${labelsCount} `}
    {' | '}
    <span className={isDualOwned ? 'text-warning' : undefined}>
      <i className="fa fa-share-alt" />
      {`${totalSharedCollections} `}
    </span>
  </Button>
));
CollectionToggle.displayName = 'CollectionToggle';
CollectionToggle.propTypes = {
  onClick: PropTypes.func.isRequired,
  labelsCount: PropTypes.number.isRequired,
  totalSharedCollections: PropTypes.number.isRequired,
  isDualOwned: PropTypes.bool,
  size: PropTypes.string,
  variant: PropTypes.string,
};
CollectionToggle.defaultProps = {
  isDualOwned: false,
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

  const formatItems = (labels) => {
    return labels.map((label) => {
      const collectionFromStore = collectionsStore.find(label.id);
      if (!collectionFromStore) return null;

      return (
        <Dropdown.Item key={label.id} onClick={(e) => handleOnClick(label, e)}>
          {collectionFromStore.label}
        </Dropdown.Item>
      );
    });
  };

  const renderCollectionsItems = (title, labels) => {
    if (labels.length === 0) return null;
    return (
      <>
        <Dropdown.Header>{title}</Dropdown.Header>
        {formatItems(labels)}
      </>
    );
  };

  // Guard against malformed entries: legacy/un-backfilled tags can contain null elements or
  // entries without a real collection id, which would otherwise throw on `label.id`.
  const validLabels = element.tag.taggable_data.collection_labels
    .filter((label) => label && label.id != null);
  const ownCollections = validLabels.filter((label) => collectionsStore.isOwnCollection(label.id));
  const sharedCollections = validLabels.filter((label) => collectionsStore.isSharedCollection(label.id));

  if (ownCollections.length === 0 && sharedCollections.length === 0) { return (<span />); }

  return (
    <Dropdown>
      <Dropdown.Toggle
        as={CollectionToggle}
        id="dropdown-custom-components"
        labelsCount={ownCollections.length}
        totalSharedCollections={sharedCollections.length}
        isDualOwned={ownCollections.length > 0 && sharedCollections.length > 0}
        size={size}
        variant={variant}
      />
      {createPortal(
        <Dropdown.Menu>
          {renderCollectionsItems('My Collections', ownCollections)}
          {renderCollectionsItems('Shared Collections', sharedCollections)}
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

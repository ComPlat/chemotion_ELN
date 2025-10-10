/* eslint-disable react/destructuring-assignment */
/* eslint-disable camelcase */
import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import {
  OverlayTrigger, Popover, Button
} from 'react-bootstrap';
import UserStore from 'src/stores/alt/stores/UserStore';
import { aviatorNavigationWithCollectionId } from 'src/utilities/routesUtils';
import { StoreContext } from 'src/stores/mobx/RootStore';

function ElementCollectionLabels({ element, placement }) {
  const { currentUser } = UserStore.getState();
  if (!currentUser) return (<span />);
  if (!element.tag) return (<span />);
  if (!element.tag.taggable_data) return (<span />);
  if (!element.tag.taggable_data.collection_labels) return (<span />);
  if (element.tag.taggable_data.collection_labels.length == 0) return (<span />);

  const collectionsStore = useContext(StoreContext).collections;

  const handleOnClick = (label, e) => {
    e.stopPropagation();
    aviatorNavigationWithCollectionId(label.id, element.type, element.id);
  }

  const formatLabels = (labels)  =>{
    return labels.map((label, index) => {
      const collectionFromStore = collectionsStore.find(label.id)
      if (!collectionFromStore) return (<span />);

      return (
        <span className="d-inline-block m-1" key={index}>
          <Button variant="light" size="sm" onClick={(e) => handleOnClick(label, e)}>
            {collectionFromStore.label}
          </Button>
        </span>
      );
    });
  }

  const renderLabels = (title, labels) => {
    if (labels.length === 0) return null;
    return (
      <>
        <Popover.Header>{title}</Popover.Header>
        <Popover.Body>{formatLabels(labels)}</Popover.Body>
      </>
    );
  }

  const ownCollections = labels.filter(label => collectionsStore.isOwnCollection(label.id))
  const sharedCollections = labels.filter(label => collectionsStore.isSharedCollection(label.id))

  const collectionOverlay = (
    <Popover className="scrollable-popover" id="element-collections">
      {renderLabels('My Collections', ownCollections)}
      {renderLabels('Shared Collections', sharedCollections)}
    </Popover>
  );

  return (
    <OverlayTrigger
      trigger="click"
      rootClose
      placement={placement}
      overlay={collectionOverlay}
    >
      <Button
        key={element.id}
        size="xxsm"
        variant="light"
        onClick={(e) => e.stopPropagation()}
      >
        <i className="fa fa-list" />
        {` ${ownCollections.length} `}
        {' - '}
        {`${sharedCollections.length} `}
        <i className="fa fa-share-alt" />
      </Button>
    </OverlayTrigger>
  );
}

export default observer(ElementCollectionLabels)

ElementCollectionLabels.propTypes = {
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
  placement: PropTypes.string,
};

ElementCollectionLabels.defaultProps = {
  placement: 'left',
};

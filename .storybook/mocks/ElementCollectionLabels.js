import React from 'react';

import { Button } from 'react-bootstrap';

export default function ElementCollectionLabels({ element }) {
  const labels = element?.tag?.taggable_data?.collection_labels || [];

  if (labels.length === 0) {
    return null;
  }

  const ownCollections = labels.filter((label) => !label.is_shared).length;
  const sharedCollections = labels.filter((label) => label.is_shared).length;

  return (
    <Button size="xxsm" variant="secondary">
      <i className="fa fa-list" />
      {` ${ownCollections} `}
      {' | '}
      <i className="fa fa-share-alt" />
      {` ${sharedCollections} `}
    </Button>
  );
}

import React from 'react';
import Aviator from 'aviator';

import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import CollapsibleButton from 'src/apps/mydb/collections/CollapsibleButton';

function urlForCurrentElement() {
  const { currentElement } = ElementStore.getState();
  if (!currentElement) return '';

  return `${currentElement.type}/${currentElement.isNew ? 'new' : currentElement.id}`;
}

function handleCollectionManagementToggle() {
  UIActions.toggleCollectionManagement();
  const { showCollectionManagement, currentCollection, isSync } = UIStore.getState();
  if (showCollectionManagement) {
    Aviator.navigate('/collection/management');
  } else {
    if (currentCollection == null || currentCollection.label == 'All') {
      Aviator.navigate(`/collection/all/${urlForCurrentElement()}`);
    } else {
      Aviator.navigate(isSync
        ? `/scollection/${currentCollection.id}/${urlForCurrentElement()}`
        : `/collection/${currentCollection.id}/${urlForCurrentElement()}`);
    }
  }
}

export default function CollectionManagementButton({ isCollapsed }) {
  return (
    <CollapsibleButton
      isCollapsed={isCollapsed}
      onClick={handleCollectionManagementToggle}
      label="Manage Collections"
      icon="fa-cog"
      variant="info"
    />
  );
}

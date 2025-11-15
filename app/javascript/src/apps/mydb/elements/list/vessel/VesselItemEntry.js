import React from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import { Table } from 'react-bootstrap';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import Aviator from 'aviator';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import PropTypes from 'prop-types';

function VesselItemEntry({ vesselItem }) {
  const showDetails = () => {
    const { currentCollection } = UIStore.getState();
    const { id, type } = vesselItem;

    const uri = `/collection/${currentCollection.id}/vessel/${id}`;
    Aviator.navigate(uri, { silent: true });

    const e = {
      type: 'vessel',
      params: {
        collectionID: currentCollection.id,
        new_vessel: false,
        vesselID: id,
      },
    };
    e.params[`${type}ID`] = id;

    elementShowOrNew(e);
  };

  const { currentElement } = ElementStore.getState();
  const backgroundColorClass = currentElement?.id === vesselItem.id ? 'text-bg-primary' : '';

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <button
      type="button"
      className={`border-0 bg-transparent ${backgroundColorClass}`}
      onClick={showDetails}
    >
      <div className="flex-grow-1">
        {vesselItem.short_label}
        {' '}
        {vesselItem.name}
      </div>
      <div>
        <ElementCollectionLabels element={vesselItem} />
      </div>
    </button>
  );
}

VesselItemEntry.propTypes = {
  vesselItem: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string,
    short_label: PropTypes.string,
    name: PropTypes.string,
  }).isRequired,
};

export default VesselItemEntry;

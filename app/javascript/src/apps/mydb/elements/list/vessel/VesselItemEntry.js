import React from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import { Table } from 'react-bootstrap';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import Aviator from 'aviator';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import PropTypes from 'prop-types';

function VesselItemEntry({ vesselItem }) {
  const showDetails = () => {
    const { currentCollection, isSync } = UIStore.getState();
    const { id, type } = vesselItem;

    const uri = isSync
      ? `/scollection/${currentCollection.id}/vessel/${id}`
      : `/collection/${currentCollection.id}/vessel/${id}`;
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

  const isElementChecked = (element) => {
    const { checkedIds = [], uncheckedIds = [], checkedAll } = UIStore.getState().vessel;
    return (checkedAll && !uncheckedIds.includes(element.id)) || checkedIds.includes(element.id);
  };

  const { currentElement } = ElementStore.getState();
  const backgroundColorClass = currentElement?.id === vesselItem.id ? 'text-bg-primary' : '';

  return (
    <div className="group-entry">
      <Table className="elements">
        <tbody>
          <tr className={`${backgroundColorClass} border-top`}>
            <td className="select-checkBox">
              <ElementCheckbox
                element={vesselItem}
                checked={isElementChecked(vesselItem)}
              />
            </td>
            <td
              className="short_label"
              onClick={showDetails}
            >
              {vesselItem.short_label}
            </td>
            <td
              className="short_label"
              onClick={showDetails}
            >
              {vesselItem.name}
            </td>
            <td>
              <ElementCollectionLabels element={vesselItem} />
            </td>
            <td className="arrow">
              <ElementDragHandle
                sourceType={DragDropItemTypes.VESSEL}
                element={vesselItem}
              />
            </td>
          </tr>
        </tbody>
      </Table>
    </div>
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

import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import { Table } from 'react-bootstrap';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import Aviator from 'aviator';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { CellLinePropTypeTableEntry } from 'src/models/cellLine/CellLinePropTypes';
import ElementStore from 'src/stores/alt/stores/ElementStore';

export default class CellLineItemEntry extends Component {
  constructor(props) {
    super(props);
    this.showDetails = this.showDetails.bind(this);
  }

  showDetails() {
    const { currentCollection, isSync } = UIStore.getState();
    const { cellLineItem } = this.props;
    const { id, type } = cellLineItem;

    const uri = isSync
      ? `/scollection/${currentCollection.id}/${type}/${id}`
      : `/collection/${currentCollection.id}/${type}/${id}`;
    Aviator.navigate(uri, { silent: true });
    const e = {
      type,
      params: {
        collectionID: currentCollection.id,
        new_cellLine: false,
        cellLineId: id
      }
    };
    e.params[`${type}ID`] = id;

    elementShowOrNew(e);
  }

  // eslint-disable-next-line class-methods-use-this
  isElementChecked(element) {
    const { checkedIds = [], uncheckedIds = [], checkedAll } = UIStore.getState().cell_line;
    return (checkedAll && !uncheckedIds.includes(element.id)) || checkedIds.includes(element.id);
  }

  render() {
    const { cellLineItem } = this.props;
    const { currentElement } = ElementStore.getState();
    const backgroundColorClass = currentElement?.id === cellLineItem.id
      ? 'text-bg-primary'
      : 'bg-gray-100';

    return (
      <div className={`d-flex mb-1 ${backgroundColorClass}`}>
        <div className="d-flex align-items-center gap-2 me-2">
          <ElementDragHandle element={cellLineItem} />
          <ElementCheckbox
            element={cellLineItem}
            checked={this.isElementChecked(cellLineItem)}
          />
        </div>
        <div className="flex-grow-1">
          {cellLineItem.short_label}
          {cellLineItem.itemName}
        </div>
        <div>
          <ElementCollectionLabels element={cellLineItem} />
        </div>
      </div>
    );
  }
}

CellLineItemEntry.propTypes = {
  cellLineItem: CellLinePropTypeTableEntry.isRequired
};

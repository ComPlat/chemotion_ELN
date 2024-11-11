import React, { Component } from 'react';
import PropTypes from 'prop-types';
import UIStore from 'src/stores/alt/stores/UIStore';
import { Table } from 'react-bootstrap';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { CellLinePropTypeTableEntry } from 'src/models/cellLine/CellLinePropTypes';
import ElementStore from 'src/stores/alt/stores/ElementStore';

export default class CellLineItemEntry extends Component {

  render() {
    const { cellLineItem, showDetails } = this.props;
    const { currentElement } = ElementStore.getState();
    const backgroundColorClass = currentElement?.id === cellLineItem.id ? 'text-bg-primary' : '';

    return (
      <div className="group-entry">
        <Table className="elements" hover>
          <tbody>
            <tr className={`${backgroundColorClass} border-top`}>
              <td className="select-checkBox">
                <ElementCheckbox element={cellLineItem} />
              </td>
              <td
                className="short_label"
                onClick={() => showDetails(cellLineItem.id)}
              >
                {cellLineItem.short_label}
              </td>
              <td
                className="item-text"
                onClick={() => showDetails(cellLineItem.id)}
              >
                <div>
                  <div className="item-properties floating">
                    <div className="starting floating item-property-value">
                      {cellLineItem.itemName}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <ElementCollectionLabels element={cellLineItem} />
              </td>
              <td className="arrow">
                <ElementContainer
                  sourceType={DragDropItemTypes.CELL_LINE}
                  element={cellLineItem}
                />
              </td>
            </tr>
          </tbody>
        </Table>
      </div>
    );
  }
}

CellLineItemEntry.propTypes = {
  cellLineItem: CellLinePropTypeTableEntry.isRequired,
  showDetails: PropTypes.func.isRequired,
};

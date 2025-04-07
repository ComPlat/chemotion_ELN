import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table } from 'react-bootstrap';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { CellLinePropTypeTableEntry } from 'src/models/cellLine/CellLinePropTypes';

export default class CellLineItemEntry extends Component {
  render() {
    const { cellLineItem, showDetails } = this.props;
    const { isElementSelected } = this.props;
    const backgroundColorClass = isElementSelected(cellLineItem) ? 'text-bg-primary' : '';

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
                onClick={() => showDetails(cellLineItem)}
              >
                {cellLineItem.short_label}
              </td>
              <td
                className="item-text"
                onClick={() => showDetails(cellLineItem)}
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
                <ElementDragHandle element={cellLineItem} />
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
  isElementSelected: PropTypes.func.isRequired,
  showDetails: PropTypes.func.isRequired,
};

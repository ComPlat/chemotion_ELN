import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import { Table } from 'react-bootstrap';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import PropTypes from 'prop-types';
import Aviator from 'aviator';
import CellLineItemText from 'src/apps/mydb/elements/list/cellLine/CellLineItemText';
import ArrayUtils from 'src/utilities/ArrayUtils';

export default class CellLineItemEntry extends Component {
  constructor() {
    super();
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
    const { checkedIds, uncheckedIds, checkedAll } = UIStore.getState().cell_line;
    return (checkedAll && ArrayUtils.isValNotInArray(uncheckedIds || [], element.id))
      || ArrayUtils.isValInArray(checkedIds || [], element.id);
  }

  render() {
    const { cellLineItem } = this.props;
    return (
      <Table className="elements" bordered hover style={{ borderTop: 0 }}>
        <tbody>
          <tr className="cell-line-group-white-background">
            <td>
              <ElementCheckbox
                element={cellLineItem}
                key={cellLineItem.id}
                checked={this.isElementChecked(cellLineItem)}
              />
            </td>
            <td>
              {cellLineItem.short_label}
            </td>

              <CellLineItemText
                cellLineItem={cellLineItem}
                showDetails={this.showDetails}
              />
              
            <td>
              <ElementContainer
                key={cellLineItem.id}
                sourceType={DragDropItemTypes.CELL_LINE}
                element={cellLineItem}
              />
            </td>
          </tr>
        </tbody>
      </Table>
    );
  }
}

CellLineItemEntry.propTypes = {
  cellLineItem: PropTypes.shape({
    amount: PropTypes.number.isRequired,
    passage: PropTypes.number.isRequired,
    short_label: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    contamination: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    is_checked: PropTypes.bool,
  }).isRequired
};

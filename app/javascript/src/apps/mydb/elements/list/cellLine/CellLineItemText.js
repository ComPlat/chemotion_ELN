import React, { Component } from 'react';
import PropTypes from 'prop-types';
/* eslint-disable jsx-a11y/click-events-have-key-events */

// eslint-disable-next-line react/prefer-stateless-function
export default class CellLineItemEntry extends Component {
  render() {
    const { cellLineItem, showDetails } = this.props;
    if (!cellLineItem) { return null; }

    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <td
        className="item-text"
        onClick={() => { showDetails(); }}
      >
        <div>
          <div className="item-properties floating">
            <div className=" starting floating item-property-value">{cellLineItem.itemName}</div>
          </div>
        </div>
      </td>
    );
  }
}

CellLineItemEntry.propTypes = {
  cellLineItem: PropTypes.shape({
    amount: PropTypes.number.isRequired,
    itemName: PropTypes.string,
    passage: PropTypes.number.isRequired,
    contamination: PropTypes.string.isRequired,
  }).isRequired,
  showDetails: PropTypes.func.isRequired
};

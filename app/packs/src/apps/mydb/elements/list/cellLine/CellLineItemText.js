import React, { Component } from 'react';
import PropTypes from 'prop-types';
/* eslint-disable jsx-a11y/click-events-have-key-events */

// eslint-disable-next-line react/prefer-stateless-function
export default class CellLineItemEntry extends Component {
  render() {
    const { cellLineItem, showDetails } = this.props;
    if (!cellLineItem) { return null; }
    let contaminationTag = <div />;
    if (cellLineItem.contamination) {
      contaminationTag = (
        <div>
          <div className="item-property-name floating">Contamination</div>
          <div className="item-colon floating">:</div>
          <div className="contaminated">{cellLineItem.contamination}</div>
        </div>
      );
    }
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <td
        className="item-text"
        onClick={() => { showDetails(); }}
      >
        <div>
          <div className="item-name-header">{cellLineItem.itemName}</div>
          <div className="item-properties floating">
            <div className="item-property-name floating">Amount</div>
            <div className="item-colon floating">-</div>
            <div className="floating item-property-value">{cellLineItem.amount}</div>
            <div className="item-property-name floating">Passage</div>
            <div className="item-colon floating">-</div>
            <div className="floating item-property-value">{cellLineItem.passage}</div>
          </div>
          <div>{contaminationTag}</div>
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

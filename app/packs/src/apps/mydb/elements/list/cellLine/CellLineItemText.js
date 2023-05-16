import React, { Component } from 'react';
import PropTypes from 'prop-types';

// eslint-disable-next-line react/prefer-stateless-function
export default class CellLineItemEntry extends Component {
  render() {
    const { cellLineItem, showDetails } = this.props;
    var contaminationTag=<div/>
    if(cellLineItem.contamination){
      contaminationTag=<div className="contaminated">!! {cellLineItem.contamination} !!</div>
    }
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <td onClick={() => { showDetails(); }}>
        Amount:
        {' '}
        {cellLineItem.amount}
        {' '}
        - Passage:
        {cellLineItem.passage}
        {' '}
        -
        Contamination:
        {' '}
        {contaminationTag}

      </td>
    );
  }
}

CellLineItemEntry.propTypes = {
  cellLineItem: PropTypes.shape({
    amount: PropTypes.number.isRequired,
    passage: PropTypes.number.isRequired,
    contamination: PropTypes.string.isRequired,
  }).isRequired,
  showDetails: PropTypes.func.isRequired
};

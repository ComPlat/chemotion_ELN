import React, {Component} from 'react';
import {Row, Col, Input, ListGroup, ListGroupItem, Button} from 'react-bootstrap';


export default class ElementalComposition extends React.Component {

  elementsList(elemental_composition) {
    let keys = Object.keys(elemental_composition.data);
    if(keys.length == 0) {
      return (
        <p>
          Sorry, it was not possible to calculate the elemental
          compositon. Check data please.
        </p>
      )
    }

    let elements = [];

    keys.map(function(key, index) {
      let value = elemental_composition.data[key];
      // adding significant figures to value if needed - no decimal places, add .00; 1 decimal place, add 0;
      const regexp = /^\d+$/; // regex for an integer (no decimal places)
      const regexp1 = /\.\d{0,1}$/; // regex to search for a value with ONLY ONE decimal place
      if (value.match(regexp)) {
        value += '.00'
      } else if (value.match(regexp1)){
        value += '0'
      }
      elements.push(
        <span className="data-item" key={key}>
          <strong>
            {key}
          </strong>
          &nbsp;
          &nbsp;
          {value}
          &nbsp;
          &nbsp;
        </span>
      );
    });
    
    return elements;
  }

  relatedLoading(elemental_composition) {
    if(!elemental_composition.loading)
      return false;

    return (
      <td className="loading" style={{textAlign:"left"}} width="13%">
        {elemental_composition.loading.toFixed(2)}
      </td>
    )
  }

  compositonTableHeader(elemental_composition) {
    return(
      <thead>
        <tr>
          <th>
            <span>{elemental_composition.description}</span>
          </th>

          <th className="loading">
            {elemental_composition.loading ? 'Loading (mmol/g)' : ''}
          </th>
        </tr>
      </thead>
    )
  }

  render() {
    let { elemental_composition, formula_changed } = this.props;

    return (
      <table className="elemental-composition">
        {this.compositonTableHeader(elemental_composition)}

        <tbody>
          <tr>
            <td className="form-inline">
              {this.elementsList(elemental_composition, formula_changed)}
            </td>
            {this.relatedLoading(elemental_composition)}
          </tr>
        </tbody>
      </table>
    )
  }
}

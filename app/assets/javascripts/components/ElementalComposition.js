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
      elements.push(
        <Input type="text"
             className="padding-left"
             ref={key}
             label={key}
             key={key}
             defaultValue={value}
             value={value}
             disabled
             readOnly
        />
      );
    });

    return elements;
  }

  relatedLoading(elemental_composition) {
    if(!elemental_composition.loading)
      return false;

    return (
      <td className="loading" align="right" width="12%">
        <Input type="text"
           key={"mc-loading" + elemental_composition.id.toString()}
           defaultValue={elemental_composition.loading}
           value={elemental_composition.loading.toFixed(2)}
           disabled
           readOnly
        />
      </td>
    )
  }

  compositonTableHeader(elemental_composition) {
    if(!elemental_composition.loading)
      return false;

    return(
      <thead>
        <tr>
          <th>
            <span>{elemental_composition.description}</span>
          </th>

          <th>Loading (mmol/g)</th>
        </tr>
      </thead>
    )
  }

  render() {
    let elemental_composition = this.props.elemental_composition || {}

    return (
      <table className="elemental-composition">
        {this.compositonTableHeader(elemental_composition)}

        <tbody>
          <tr>
            <td className="form-inline">
              {this.elementsList(elemental_composition)}
            </td>
            {this.relatedLoading(elemental_composition)}
          </tr>
        </tbody>
      </table>
    )
  }
}

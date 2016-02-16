import React, {Component} from 'react';
import {Row, Col, Input, ListGroup, ListGroupItem, Button} from 'react-bootstrap';

export default class ElementalComposition extends React.Component {

  elementsList(sample) {
    let keys = Object.keys(sample.elemental_analyses);
    let msg;
    if(keys.length == 0 || sample.formulaChanged) {
      if(sample.formulaChanged) {
        msg = "Formula was changed. Please save sample to calculate \
                   the elemental composition.";
      } else {
        msg = "Sorry, it was not possible to calculate the elemental \
                   compositon.Check data please."
      }
      return (
        <p>
          {msg}
        </p>
      )
    }

    let elements = keys.map(function(key, index) {
      let value = sample.elemental_analyses[key];
      return (
        <Input type="text"
             className="padding-left"
             ref={key}
             label={key}
             key={key}
             defaultValue={value}
             value={value}
             disabled
        />
      );
    });

    return elements;
  }

  render() {
    let sample = this.props.sample || {}

    if (sample.isNew) {
      return false;
    }

    return (
      <table className="elemental-composition">
        <tbody>
          <tr>
            <label>Elemental composition</label>
            <td className="form-inline">
              {this.elementsList(sample)}
            </td>
          </tr>
        </tbody>
      </table>
    )
  }
}

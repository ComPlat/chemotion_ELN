import React, {Component} from 'react';
import {Input} from 'react-bootstrap';
import NumeralInput from './NumeralInput'
import NotificationActions from './actions/NotificationActions'

export default class ElementalCompositionCustom extends React.Component {

  checkElementsSum(el_composition) {
    let sum = 0.0;

    let keys = Object.keys(el_composition.data);

    keys.map(function(key, index) {
      sum += parseFloat(el_composition.data[key] || 0.0);
    });

    if(sum > 100.0) {
      NotificationActions.add({
        message: 'Percentage sum is more than 100%',
        level: 'error'
      });
      return false;
    } else {
      return true;
    }
  }

  handleElementsListChanged(v, key, el_composition) {
    let oldval = el_composition.data[key];

    el_composition.data[key] = v;

    this.checkElementsSum(el_composition);
  }

  elementsList(el_composition) {
    let elements = [];
    let keys = Object.keys(el_composition.data);
    let klass = this;

    keys.map(function(key, index) {
      let value = el_composition.data[key];
      elements.push(<NumeralInput
        className="padding-left"
        numeralFormat='0,0.00'
        label={key}
        key={key}
        value={value}
        defaultValue={value}
        onChange={(v)=> klass.handleElementsListChanged(v, key, el_composition)}
        />
      );
    });

    return elements;
  }

  hideLoading(elemental_composition) {
    let c_type = elemental_composition.composition_type;

    return c_type != 'found' && !elemental_composition.loading;
  }

  relatedLoading(el_composition) {
    if(this.hideLoading(el_composition))
      return false;

    return (
      <td className="loading" align="right" width="13%">
        <Input type="text"
           key={"mc-loading" + el_composition.id.toString()}
           defaultValue={el_composition.loading}
           value={el_composition.loading && el_composition.loading.toFixed(2)}
           disabled
           readOnly
        />
      </td>
    )
  }

  compositonTableHeader(elemental_composition) {
    // if it is composition data of molecule we hide table header as  well
    if(this.hideLoading(elemental_composition))
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
    if (Object.keys(elemental_composition).length == 0) {
      return false;
    }

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

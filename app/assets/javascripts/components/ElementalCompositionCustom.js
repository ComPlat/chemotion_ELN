import React, {Component} from 'react';
import {Input} from 'react-bootstrap';
import NumeralInput from './NumeralInput';
import NotificationActions from './actions/NotificationActions';
var _ = require('lodash');

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

    // set loading_type to what we get after calculations
    if(this.props.parent) {
      this.props.parent.setLoadingType('found');
    }

    this.checkElementsSum(el_composition);
  }

  elementsList(el_composition, concat_formula) {
    let elements = [];

    let klass = this;
    let newData = {};

    // be sure that 2-symbol (Br) elements are all before one-symbol (B)!
    // TODO: check performance
    let mendeleev = /(He|Li|Be|Ne|Na|Mg|Al|Si|Cl|Ar|Ca|Sc|Ti|Cr|Mn|Fe|Co|Ni|Cu|Zn|Ga|Ge|As|Se|Br|Kr|Rb|Sr|Zr|Nb|Mo|Tc|Ru|Rh|Pd|Ag|Cd|In|Sn|Sb|Te|Xe|Cs|Ba|La|Ce|Pr|Nd|Pm|Sm|Eu|Gd|Tb|Dy|Ho|Er|Tm|Yb|Lu|Hf|Ta|Re|Os|Ir|Pt|Au|Hg|Tl|Pb|Bi|Po|At|Rn|Fr|Ra|Ac|Th|Pa|Np|Pu|Am|Cm|Bk|Cf|Es|Fm|Md|No|Lr|Rf|Db|Sg|Bh|Hs|Mt|H|B|C|N|O|F|P|S|K|V|Y|I|W|U)/g
    let keys = _.uniq(concat_formula.match(mendeleev)).sort();

    // add new key to custom composition, so that we have new input
    keys.forEach(function(key) {
      newData[key] = (el_composition.data[key] || 0.0);
      elements.push(<NumeralInput
        className="padding-left"
        numeralFormat='0,0.00'
        label={key}
        key={key + 'found'}
        value={newData[key]}
        defaultValue={newData[key]}
        onChange={(v)=> klass.handleElementsListChanged(v, key, el_composition)}
        />
      );
    });

    el_composition.data = newData;

    return elements;
  }

  hideLoading(elemental_composition) {
    let c_type = elemental_composition.composition_type;
    return this.props.hideLoading || !elemental_composition.loading;
  }

  relatedLoading(el_composition) {
    if(this.hideLoading(el_composition))
      return false;

    return (
      <td className="loading" align="right" width="13%">
        <Input type="text"
           key={"mc-loading" + (el_composition.id || 0).toString()}
           defaultValue={el_composition.loading}
           value={el_composition.loading && el_composition.loading.toFixed(2)}
           disabled
           readOnly
        />
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

          <th>
            {!this.hideLoading(elemental_composition) ? 'Loading (mmol/g)' : ''}
          </th>
        </tr>
      </thead>
    )
  }

  render() {
    let { elemental_composition, concat_formula, parent} = this.props;

    if(!elemental_composition)
      return false;

    return (
      <table className="elemental-composition">
        {this.compositonTableHeader(elemental_composition)}

        <tbody>
          <tr>
            <td className="form-inline">
              {this.elementsList(elemental_composition, concat_formula)}
            </td>
            {this.relatedLoading(elemental_composition)}
          </tr>
        </tbody>
      </table>
    )
  }
}

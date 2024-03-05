import React from 'react';
import {FormControl} from 'react-bootstrap';
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

  handleElementsListChanged(v, key, el_composition, handleElementalChanged) {
    let oldval = el_composition.data[key];

    el_composition.data[key] = v;

    if (this.checkElementsSum(el_composition)) {
      handleElementalChanged(el_composition)
    }
  }

  elementsList(el_composition, concat_formula) {
    let elements = [];

    let klass = this;
    let handleElementalChanged = klass.props.handleElementalChanged;
    let newData = {};

    // be sure that 3, 2-symbol (Br) elements are all before one-symbol (B)!
    // TODO: check performance
    let mendeleev = /(Uut|Uup|Uus|Uuo|He|Li|Be|Ne|Na|Mg|Al|Si|Cl|Ar|Ca|Sc|Ti|Cr|Mn|Fe|Co|Ni|Cu|Zn|Ga|Ge|As|Se|Br|Kr|Rb|Sr|Zr|Nb|Mo|Tc|Ru|Rh|Pd|Ag|Cd|In|Sn|Sb|Te|Xe|Cs|Ba|La|Ce|Pr|Nd|Pm|Sm|Eu|Gd|Tb|Dy|Ho|Er|Tm|Yb|Lu|Hf|Ta|Re|Os|Ir|Pt|Au|Hg|Tl|Pb|Bi|Po|At|Rn|Fr|Ra|Ac|Th|Pa|Np|Pu|Am|Cm|Bk|Cf|Es|Fm|Md|No|Lr|Rf|Db|Sg|Bh|Hs|Mt|Ds|Rg|Cn|Fl|Lv|H|B|C|N|O|F|P|S|K|V|Y|I|W|U)/g
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
        onChange={(v)=> klass.handleElementsListChanged(v, key, el_composition, handleElementalChanged)}
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
      <td className="loading" style={{textAlign:"left"}} width="13%">
        <FormControl type="text"
           key={"mc-loading" + (el_composition.id || 0).toString()}
           defaultValue={el_composition.loading || ''}
           value={el_composition.loading && el_composition.loading.toFixed(2) || ''}
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

          <th className="loading">
            {!this.hideLoading(elemental_composition) ? 'Loading (mmol/g)' : ''}
          </th>
        </tr>
      </thead>
    )
  }

  render() {
    let { elemental_composition, concat_formula, parent} = this.props;

    if(!elemental_composition) return false;

    return (
      <table className="elemental-composition-custom">
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

import React from 'react';
import { Form } from 'react-bootstrap';
import NumeralInput from 'src/apps/mydb/elements/details/NumeralInput';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import _ from 'lodash';

export default class ElementalCompositionCustom extends React.Component {
  checkElementsSum(el_composition) {
    let sum = 0.0;
    Object.values(el_composition.data).forEach((value) => {
      sum += parseFloat(value) || 0.0;
    });

    if (sum > 100.0) {
      NotificationActions.add({
        message: 'Percentage sum is more than 100%',
        level: 'error'
      });
      return false;
    }

    return true;
  }

  handleElementsListChanged(v, key, el_composition) {
    el_composition.data[key] = v;

    const { handleElementalChanged } = this.props;
    if (this.checkElementsSum(el_composition)) {
      handleElementalChanged(el_composition);
    }
  }

  elementsList(el_composition, concat_formula) {
    const elements = [];
    const newData = {};

    // be sure that 3, 2-symbol (Br) elements are all before one-symbol (B)!
    // TODO: check performance
    const mendeleev = /(Uut|Uup|Uus|Uuo|He|Li|Be|Ne|Na|Mg|Al|Si|Cl|Ar|Ca|Sc|Ti|Cr|Mn|Fe|Co|Ni|Cu|Zn|Ga|Ge|As|Se|Br|Kr|Rb|Sr|Zr|Nb|Mo|Tc|Ru|Rh|Pd|Ag|Cd|In|Sn|Sb|Te|Xe|Cs|Ba|La|Ce|Pr|Nd|Pm|Sm|Eu|Gd|Tb|Dy|Ho|Er|Tm|Yb|Lu|Hf|Ta|Re|Os|Ir|Pt|Au|Hg|Tl|Pb|Bi|Po|At|Rn|Fr|Ra|Ac|Th|Pa|Np|Pu|Am|Cm|Bk|Cf|Es|Fm|Md|No|Lr|Rf|Db|Sg|Bh|Hs|Mt|Ds|Rg|Cn|Fl|Lv|H|B|C|N|O|F|P|S|K|V|Y|I|W|U)/g;
    const keys = _.uniq(concat_formula.match(mendeleev)).sort();

    // add new key to custom composition, so that we have new input
    keys.forEach((key) => {
      newData[key] = (el_composition.data[key] || 0.0);
      elements.push(
        <Form.Group key={key} className="d-flex align-items-baseline gap-2">
          <Form.Label>{key}</Form.Label>
          <NumeralInput
            numeralFormat="0,0.00"
            label={key}
            value={newData[key]}
            defaultValue={newData[key]}
            onChange={(v) => this.handleElementsListChanged(v, key, el_composition)}
          />
        </Form.Group>
      );
    });

    el_composition.data = newData;
    return elements;
  }

  render() {
    const { elemental_composition, concat_formula } = this.props;
    if (!elemental_composition) return null;

    const hideLoading = this.props.hideLoading || !elemental_composition.loading;

    return (
      <table>
        <thead>
          <tr>
            <th>{elemental_composition.description}</th>
            <th style={{ width: '20%' }}>
              {!hideLoading ? 'Loading (mmol/g)' : ''}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="d-flex justify-content-start gap-3">
              {this.elementsList(elemental_composition, concat_formula)}
            </td>
            <td>
              {!hideLoading && (
                <Form.Control
                  type="text"
                  key={`mc-loading${(elemental_composition.id || 0).toString()}`}
                  defaultValue={elemental_composition.loading || ''}
                  value={elemental_composition.loading && elemental_composition.loading.toFixed(2) || ''}
                  disabled
                  readOnly
                />
              )}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

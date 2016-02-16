import React, {Component} from 'react';
import {Input, ListGroup, ListGroupItem, Button, RadioButton} from 'react-bootstrap';
import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementalComposition from './ElementalComposition'
import NotificationActions from './actions/NotificationActions'

export default class PolymerSection extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      sample: props.sample
    }
  }

  handleAmountChanged(amount) {
    this.props.parent.handleAmountChanged(amount);
  }

  handleCustomInfoNumericChanged(e, name, residue, sample) {
    residue.custom_info[name] = e.value;

    // make calculations if loading was changed
    if(name == 'loading') {
      this.handleAmountChanged(sample.amount);

      let mw_defined = sample.molecule.molecular_weight - 1.0;
      let value_to_check = e.value * mw_defined;

      if (value_to_check > 1000.0) {
        sample.error_loading = true;
        NotificationActions.add({
          message: 'Combination of loading and molecular weight is wrong\
           (MW*L > 1000.0)',
          level: 'error'
        });
        return 'error';
      } else {
        sample.error_loading = false;
        return 'success';
      }
    } else {
      this.setState({
        sample: sample
      });
    }
  }

  handleCustomInfoChanged(e, residue, sample) {
    residue.custom_info[e.target.name] = e.target.value;

    if(e.target.name == "formula") {
      sample.formulaChanged = true;
    }

    this.setState({
      sample: sample
    });
  }

  handlePRadioChanged(e, residue, sample) {
    residue.custom_info['loading_type'] = e.target.value;

    this.setState({
      sample: sample
    });
  }
  // "Loading (according to mass difference):"
  customInfoRadio(label, value, residue, sample) {
    return (
      <Input label={label}
             onChange={(e) => this.handlePRadioChanged(e, residue, sample)}
             checked={residue.custom_info.loading_type == value}
             name="loading_type"
             value={value}
             type="radio"/>
    )
  }

  checkLoadingInputStatus(sample) {
    if (sample.error_loading) {
      return 'error';
    } else {
      return 'success';
    }
  }

  customInfoInput(key, value, residue, sample) {
    if(key == "loading_type")
      return false;

    let label = key.charAt(0).toUpperCase() + key.slice(1);
    label = label.replace('_', ' ');

    if(key == "loading") {
      return (
       <table width="100%"><tbody><tr>
       <td>
        {this.customInfoRadio("Loading (according to mass difference):","mass", residue, sample)}
        {this.customInfoRadio("Loading (according to external estimation):","external", residue, sample)}
        {this.customInfoRadio("Loading (according to EA):","EA", residue, sample)}
       </td>
       <td width="25%">
         <NumeralInputWithUnits
           value={value}
           unit='mmol/g'
           label="Loading (mmol/g)"
           numeralFormat='0,0.00'
           ref={key}
           name={key}
           bsStyle={this.checkLoadingInputStatus(sample)}
           onChange={(e) => this.handleCustomInfoNumericChanged(e, key, residue, sample)}
           />
       </td>
       </tr></tbody></table>
     )
   } else if (key == "formula") {
     return (
       <div>
       <Button className="pull-right"
               bsStyle="warning"
               onClick={this.props.parent._submitFunction.bind(this.props.parent)}>
        Save
       </Button>
       <div className="col-sm-10 formula-input">
         <Input type="text" label={label}
                value={value}
                name={key}
                ref={key}
                onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
         />
       </div>
       </div>
    )
   } else {
      return (
        <Input type="text" label={label}
               value={value}
               name={key}
               ref={key}
               onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
        />
      )
    }
  }

  render() {
    let sample = this.props.sample || {}
    let molfile = sample.molfile;

    let residue = sample.residues[0];

    let klass = this;

    let keys = Object.keys(residue.custom_info)
    let dynamic_fields = keys.map(function(key, index) {
      let value = residue.custom_info[key];
      return klass.customInfoInput(key, value, residue, sample);
    });

    return (
      <ListGroupItem>
        <table width="100%" className="polymer-section">
          <tbody>
            <tr>
              <td width="50%" className="padding-right">
                <ElementalComposition sample={sample}>
                </ElementalComposition>
              </td>
              <td width="50%">
                <div>
                  <label>Polymer Section</label>
                  {dynamic_fields}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </ListGroupItem>
    )
  }
}

import React, {Component} from 'react';
import {Input, ListGroup, ListGroupItem, Button, RadioButton} from 'react-bootstrap';
import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementalCompositionGroup from './ElementalCompositionGroup'
import NotificationActions from './actions/NotificationActions'
import Select from 'react-select'

export default class PolymerSection extends React.Component {

  constructor(props) {
    super(props);

    // use has to set loading on new sample
    if(!props.sample.loading && !props.sample.reaction_product) {
      props.sample.error_loading = true
    }

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

      let errorMessage;
      if(e.value == 0.0)
        errorMessage = 'Loading can not be 0. Please define a value.'

      let mw_defined = sample.molecule.molecular_weight;
      let value_to_check = e.value * mw_defined;

      if (value_to_check > 1000.0) {
        errorMessage = 'Combination of loading and molecular weight is wrong\
         (MW*L > 1.0)'
      }

      if(errorMessage){
        sample['error_' + name] = true;
        NotificationActions.add({
          message: errorMessage,
          level: 'error'
        });
      } else {
        sample['error_' + name] = false;
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
      if(e.target.value) {
        sample.formulaChanged = true;
      }
    }

    this.setState({
      sample: sample
    });
  }

  handlePRadioChanged(e, residue, sample) {
    residue.custom_info['loading_type'] = e.target.value;

    // set 0 to external loading input if we uncheck it
    if(e.target.value != 'external') {
      residue.custom_info.external_loading = residue.custom_info.loading;
    }

    let e_compositon = sample.elemental_compositions.find(function(item) {
      return item.composition_type == e.target.value
    });

    if (e_compositon)
      sample.loading = e_compositon.loading;

    this.setState({
      sample: sample
    });
  }

  handlePolymerTypeSelectChanged(value, residue, sample){
    residue.custom_info['polymer_type'] = value;

    this.setState({
      sample: sample
    });

    // tell parent (SampleDetails) component about changes
    this.props.parent.handleSampleChanged(sample);
  }

  checkInputStatus(sample, key) {
    if (sample['error_' + key]) {
      return 'error';
    } else {
      return 'success';
    }
  }

  polymerFormula(sample, residue) {
    return (
      <div key={'polymer_formula' + sample.id.toString()}>
      <Button className="pull-right"
              bsStyle="warning"
              disabled={!sample.isValid}
              onClick={this.props.parent._submitFunction.bind(this.props.parent)}>
       Save
      </Button>
      <div className="col-sm-10 formula-input">
        <Input type="text" label="Formula"
               value={residue.custom_info.formula}
               name="formula"
               key={'polymer_formula_input' + sample.id.toString()}
               onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
        />
      </div>
      </div>
    )
  }

  customInfoRadio(label, value, residue, sample) {
    let additionalLoadingInput = false;

    if(value == 'external') {
      additionalLoadingInput = (
        <td width="15%" className="external_loading_input">
          <NumeralInputWithUnits
            value={residue.custom_info.loading}
            unit='mmol/g'
            numeralFormat='0,0.00'
            key={'polymer_loading_input' + sample.id.toString()}
            name="polymer_external_loading"
            disabled={residue.custom_info.loading_type != value}
            bsStyle={this.checkInputStatus(sample, 'loading')}
            onChange={(e) => this.handleCustomInfoNumericChanged(e, 'loading', residue, sample)}
            />
         </td>
      )
    }

    let rel_composition = sample.elemental_compositions.find(function(item) {
      return item.composition_type == value
    })

    return (
      <tr>
        <td>
          <Input label={label}
                 onChange={(e) => this.handlePRadioChanged(e, residue, sample)}
                 checked={residue.custom_info.loading_type == value}
                 name="loading_type"
                 key={value + sample.id.toString() + 'loading_type'}
                 value={value}
                 disabled={value != 'external' && !rel_composition}
                 type="radio"/>
        </td>
        {additionalLoadingInput}
      </tr>
    )
  }

  polymerLoading(sample, residue) {
    if(sample.reaction_product)
      return false;

    return (
      <table width="100%" key={'polymer_loading' + sample.id.toString()}>
      <tbody>
        {this.customInfoRadio("Loading (according to mass difference)","mass_diff", residue, sample)}
        {this.customInfoRadio("Loading (according to external estimation):","external", residue, sample)}
        {this.customInfoRadio("Loading (according to EA)","found", residue, sample)}
        {this.customInfoRadio("Loading (according to 100% conversion)","full_conv", residue, sample)}
       <tr>
         <td></td>
         <td width="15%">
          <NumeralInputWithUnits
            value={sample.loading}
            unit='mmol/g'
            label="Loading (mmol/g)"
            numeralFormat='0,0.00'
            key={'polymer_loading_input' + sample.id.toString()}
            name="polymer_loading"
            bsStyle={this.checkInputStatus(sample, 'loading')}
            disabled
            readOnly
            />
          </td>
       </tr>
       </tbody>
       </table>
      )
  }

  polymerType(sample, residue) {
    let selectOptions = [
      {label: 'Polystyrene', value: 'polystyrene'},
      {label: 'Polyethyleneglycol', value: 'polyethyleneglycol'},
      {label: 'Self-defined', value: 'self_defined'}
    ];

    return (
      <div>
        <label>Polymer type</label>
        <Select
          options={selectOptions}
          simpleValue
          key={"polymer_type" + sample.id.toString()}
          name="polymer_type"
          value={residue.custom_info.polymer_type}
          clearable={false}
          onChange={(v) => this.handlePolymerTypeSelectChanged(v, residue, sample)}
          />
      </div>
    )
  }

  polymerCrossLinkage(sample, residue) {
    return (
      <Input type="text" label="Cross-linkage"
             value={residue.custom_info.cross_linkage}
             name="cross_linkage"
             key={'cross_linkage' + sample.id.toString()}
             onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
      />
    )
  }

  render() {
    let sample = this.props.sample || {}
    let molfile = sample.molfile;

    let residue = sample.residues[0];

    return (
      <ListGroupItem>
        <table width="100%" className="polymer-section">
          <tbody>
            <tr>
              <td width="50%" className="padding-right">
                <ElementalCompositionGroup sample={sample}/>
              </td>
              <td width="50%">
                <div>
                  <label>Polymer Section</label>
                  {this.polymerFormula(sample, residue)}
                  {this.polymerLoading(sample, residue)}

                  <table width="100%">
                  <tbody>
                    <tr>
                      <td width="50%">
                        {this.polymerType(sample, residue)}
                      </td>
                      <td width="50%" className="cross_linkage">
                        {this.polymerCrossLinkage(sample, residue)}
                      </td>
                    </tr>
                  </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </ListGroupItem>
    )
  }
}

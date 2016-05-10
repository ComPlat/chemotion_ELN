import React, {Component} from 'react';
import {Input, ListGroup, ListGroupItem, Button, RadioButton, Row, Col} from 'react-bootstrap';
import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo'
import ElementalCompositionGroup from './ElementalCompositionGroup'
import NotificationActions from './actions/NotificationActions'
import Select from 'react-select'

export default class PolymerSection extends React.Component {

  constructor(props) {
    super(props);

    // use has to set loading on new sample
    if(props.sample.contains_residues && !props.sample.loading && !props.sample.reaction_product) {
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
      if(residue.custom_info.loading_type == 'external')
        sample.external_loading = e.value;

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

    if(e.target.value == 'external'){
      sample.loading = sample.external_loading;
    }
    else {
      let e_compositon = sample.elemental_compositions.find(function(item) {
        return item.composition_type == e.target.value
      });

      if (e_compositon)
        sample.loading = e_compositon.loading;
    }

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
      return 'danger';
    } else {
      return 'success';
    }
  }

  polymerFormula(sample, residue) {
    return (
      <Input type="text" label="Formula"
             value={residue.custom_info.formula}
             name="formula"
             key={'polymer_formula_input' + sample.id.toString()}
             onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
      />
    )
  }

  customInfoRadio(label, value, residue, sample) {
    let additionalLoadingInput = false;

    if(value == 'external') {
      let disabled = !(residue.custom_info.loading_type == value);
      additionalLoadingInput = (
        <td width="50%" className="loading-input">
          <NumeralInputWithUnitsCompo
            value={sample.loading}
            unit='mmol/g'
            metricPrefix='none'
            metricPrefixes = {['none']}
            precision={3}
            key={'polymer_loading_input' + sample.id.toString()}
            name="polymer_loading"
            bsStyle={this.checkInputStatus(sample, 'loading')}
            onChange={(e) => this.handleCustomInfoNumericChanged(e, 'loading', residue, sample)}
            disabled={disabled}
            readOnly={disabled}
          />
        </td>
      )
    }

    let rel_composition = sample.elemental_compositions.find(function(item) {
      return item.composition_type == value
    });
    let rel_loading = rel_composition && rel_composition.loading;

    return (
      <tr>
        <td>
          <Input label={label}
                 onChange={(e) => this.handlePRadioChanged(e, residue, sample)}
                 checked={residue.custom_info.loading_type == value}
                 name="loading_type"
                 key={value + sample.id.toString() + 'loading_type'}
                 value={value}
                 disabled={value != 'external' && !rel_loading}
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
      <thead>
       <tr>
         <th>
           <label>Loading according to:</label>
         </th>
       </tr>
      </thead>
      <tbody>
        {this.customInfoRadio("Mass difference","mass_diff", residue, sample)}
        {this.customInfoRadio("100% conversion","full_conv", residue, sample)}
        {this.customInfoRadio("Elemental analyses","found", residue, sample)}
        {this.customInfoRadio("External estimation","external", residue, sample)}
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
      <Select
        options={selectOptions}
        simpleValue
        key={"polymer_type" + sample.id.toString()}
        name="polymer_type"
        value={residue.custom_info.polymer_type}
        clearable={false}
        onChange={(v) => this.handlePolymerTypeSelectChanged(v, residue, sample)}
        />
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

    if(!this.props.show)
      return false;

    return (
      <div className="polymer-section">
        <Row>
          <Col md={4}>
            <label>Polymer type</label>
            {this.polymerType(sample, residue)}
          </Col>
          <Col md={4}>{this.polymerCrossLinkage(sample, residue)}</Col>

          <Col md={3}>{this.polymerFormula(sample, residue)}</Col>
          <Col md={1}>
            <Button id="external-save-btn"
                    bsStyle="warning"
                    disabled={!sample.isValid}
                    onClick={this.props.parent._submitFunction.bind(this.props.parent)}>
             Save
            </Button>
          </Col>
        </Row>
        <Row>
          <Col md={8}>
            <ElementalCompositionGroup sample={sample}/>
          </Col>
          <Col md={4}>
            {this.polymerLoading(sample, residue)}
          </Col>
        </Row>
      </div>
    )
  }
}

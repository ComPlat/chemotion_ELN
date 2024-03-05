import React from 'react';
import {FormGroup, ControlLabel, FormControl, Radio,  Button, Row, Col} from 'react-bootstrap';
import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo'
import ElementalCompositionGroup from './ElementalCompositionGroup'
import NotificationActions from './actions/NotificationActions'
import Select from 'react-select'

export default class PolymerSection extends React.Component {

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

      if(errorMessage)
        NotificationActions.add({
          message: errorMessage,
          level: 'error'
        });

    } else {
      this.props.parent.handleSampleChanged(sample);
    }
  }

  handleCustomInfoChanged(e, residue, sample) {
    residue.custom_info[e.target.name] = e.target.value;

    if(e.target.name == "formula") {
      if(e.target.value) {
        sample.formulaChanged = true;
      }
    }

    this.props.parent.handleSampleChanged(sample);
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

    this.props.parent.handleSampleChanged(sample);
  }

  handlePolymerTypeSelectChanged(value, residue, sample){
    residue.custom_info['polymer_type'] = value;
    delete residue.custom_info['surface_type'];

    // tell parent (SampleDetails) component about changes
    this.props.parent.handleSampleChanged(sample);
  }

  handleSurfaceTypeSelectChanged(value, residue, sample){
    residue.custom_info['surface_type'] = value;
    delete residue.custom_info['polymer_type'];
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
      <FormGroup>
        <ControlLabel>Formula</ControlLabel>
        <FormControl type="text"
          value={residue.custom_info.formula || ''}
          name="formula"
          key={'polymer_formula_input' + sample.id.toString()}
          onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
        />
      </FormGroup>
    )
  }

  customInfoRadio(label, value, residue, sample) {
    let additionalLoadingInput = false;

    if(value == 'external') {
      let disabled = !(residue.custom_info.loading_type == value);
      additionalLoadingInput = (
        <td width="50%" className="loading-input visible-hd">
          <NumeralInputWithUnitsCompo
            value={sample.loading}
            unit='mmol/g'
            metricPrefix='n'
            metricPrefixes = {['n']}
            precision={3}
            key={'polymer_loading_input' + sample.id.toString()}
            name="polymer_loading"
            // TODO: enable again
            //bsStyle={this.checkInputStatus(sample, 'loading')}
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
          <FormGroup>
            <Radio onChange={(e) => this.handlePRadioChanged(e, residue, sample)}
                 checked={residue.custom_info.loading_type == value}
                 name="loading_type"
                 key={value + sample.id.toString() + 'loading_type'}
                 value={value}
                 disabled={value != 'external' && !rel_loading}
            >{label}</Radio>
          </FormGroup>
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
        <tr className="hidden-hd">
          <td>
            <NumeralInputWithUnitsCompo
              value={sample.loading}
              unit='mmol/g'
              metricPrefix='n'
              metricPrefixes = {['n']}
              precision={3}
              key={'polymer_loading_input' + sample.id.toString()}
              name="polymer_loading"
              bsStyle={this.checkInputStatus(sample, 'loading')}
              onChange={(e) => this.handleCustomInfoNumericChanged(e, 'loading', residue, sample)}
              disabled={residue.custom_info.loading_type != 'external'}
              readOnly={residue.custom_info.loading_type != 'external'}
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

  surfaceType(sample, residue) {
    let selectOptions = [
      {label: 'Glass', value: 'glass'},
      {label: 'Si native oxide', value: 'si Native Oxide'},
      {label: 'Si, 5nm Ti, 100nm Au', value: 'si, 5nm Ti, 100nm Au'}
    ];

    return (
      <Select
        options={selectOptions}
        simpleValue
        key={`surface_type_${sample.id}`}
        name="surface_type"
        value={residue.custom_info.surface_type}
        clearable={false}
        onChange={(v) => this.handleSurfaceTypeSelectChanged(v, residue, sample)}
      />
    )
  }

  polymerCrossLinkage(sample, residue) {
    return (
      <FormGroup>
        <ControlLabel>Cross-linkage</ControlLabel>
        <FormControl type="text"
          value={residue.custom_info.cross_linkage || ''}
          name="cross_linkage"
          key={'cross_linkage' + sample.id.toString()}
          onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
        />
      </FormGroup>
    )
  }

  render() {
    let sample = this.props.sample || {}
    let residue = sample.residues[0];

    if(!this.props.show)
      return false;

    return (
      <div className="polymer-section">
        <Row>
          <Col md={6}>
            <label>Polymer type</label>
            {this.polymerType(sample, residue)}
          </Col>
          <Col md={6}>
            <label>Surface type</label>
            {this.surfaceType(sample, residue)}
          </Col>
        </Row>
        <br />
        <Row>
          <Col md={6}>
            {this.polymerCrossLinkage(sample, residue)}
          </Col>
          <Col md={6}>
            {this.polymerFormula(sample, residue)}
          </Col>
        </Row>
        <Row>
          <Col md={8}>
            <ElementalCompositionGroup
                handleSampleChanged={(s) => this.props.parent.handleSampleChanged(s)}
                sample={sample}/>
          </Col>
          <Col md={4}>
            {this.polymerLoading(sample, residue)}
          </Col>
        </Row>
      </div>
    )
  }
}

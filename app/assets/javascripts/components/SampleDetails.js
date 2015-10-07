import React from 'react';
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal, Panel, ListGroup, ListGroupItem, Glyphicon} from 'react-bootstrap';
import SVG from 'react-inlinesvg';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';

import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementCollectionLabels from './ElementCollectionLabels';
import Select from 'react-select';

import StructureEditorModal from './structure_editor/StructureEditorModal';

import Aviator from 'aviator';

export default class SampleDetails extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      sample: props.sample,
      showStructureEditor: false
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    if(!state.currentElement || state.currentElement.type == 'sample') {
      this.setState({
        sample: state.currentElement
      });
    }
  }

  closeDetails() {
    UIActions.deselectAllElements();

    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  //todo: belongs to Action/Store
  createSampleObject() {
    let uiState = UIStore.getState();
    return {
      id: this.state.sample.id,
      name: this.nullOrValue(this.state.sample.name),
      external_label: this.nullOrValue(this.state.sample.external_label),
      amount_value: this.nullOrValue(this.state.sample.amount_value),
      amount_unit: this.nullOrValue(this.state.sample.amount_unit),
      description: this.nullOrValue(this.state.sample.description),
      purity: this.nullOrValue(this.state.sample.purity),
      solvent: this.nullOrValue(this.state.sample.solvent),
      impurities: this.nullOrValue(this.state.sample.impurities),
      location: this.nullOrValue(this.state.sample.location),
      molfile: this.nullOrValue(this.state.sample.molfile),
      molecule: this.nullOrValue(this.state.sample.molecule),
      is_top_secret: this.state.sample.is_top_secret || false,
      collection_id: this.nullOrValue(uiState.currentCollectionId)
    }
  }

  nullOrValue(option) {
    if(option == '***') {
      return null;
    } else {
      return option;
    }
  }

  updateSample() {
    ElementActions.updateSample(this.createSampleObject());
  }

  createSample() {
    ElementActions.createSample(this.createSampleObject());
  }

  handleNameChanged(e) {
    let sample = this.state.sample;
    sample.name = this.refs.nameInput.getValue();
    this.setState({
      sample: sample
    });
  }

  handleExternalLabelChanged(e) {
    let sample = this.state.sample;
    sample.external_label = this.refs.externalLabelInput.getValue();
    this.setState({
      sample: sample
    });
  }

  handleDescriptionChanged(e) {
    let sample = this.state.sample;
    sample.description = this.refs.descriptionInput.getValue();
    this.setState({
      sample: sample
    });
  }

  handleAmountChanged(amount) {
    let sample = this.state.sample;
    sample.setAmountAndNormalizeToMilligram(amount.value, amount.unit);

    this.setState({
      sample: sample
    });
  }

  handlePurityChanged(e) {
    let sample = this.state.sample;
    sample.purity = this.refs.purityInput.getValue();
    this.setState({
      sample: sample
    });
  }

  handleDensityChanged(e) {
    let sample = this.state.sample;
    sample.molecule_density = this.refs.densityInput.getValue();
    this.setState({
      sample: sample
    });
  }

  handleImpuritiesChanged(e) {
    let sample = this.state.sample;
    sample.impurities = this.refs.impuritiesInput.getValue();
    this.setState({
      sample: sample
    });
  }

  handleBoilingPointChanged(e) {
    let sample = this.state.sample;
    sample.molecule_boiling_point = this.refs.boilingPointInput.getValue();
    this.setState({
      sample: sample
    });
  }

  handleLocationChanged(e) {
    let sample = this.state.sample;
    sample.location = this.refs.locationInput.getValue();
    this.setState({
      sample: sample
    });
  }

  handleSolventChanged(event) {
    let {sample} = this.state;
    sample.solvent = event;
    this.setState({
      sample
    });
  }

  handleMeltingPointChanged(e) {
    let sample = this.state.sample;
    sample.molecule_melting_point = this.refs.meltingPointInput.getValue();
    this.setState({
      sample: sample
    });
  }

  handleTopSecretChanged(e) {
    let sample = this.state.sample;
    let checkedState = this.refs.topSecretInput.props.checked;
    
    sample.is_top_secret = !checkedState;
    this.setState({
      sample: sample
    });
  }

  handleUnitChanged(unit, nextUnit, value) {
    console.log("ajax call with unit: " + unit + " nextUnit: " + nextUnit + " and value: " + value);
    let convertedValue = value;
    if(unit && nextUnit && unit != nextUnit) {
      switch(unit) {
        case 'g':
          if(nextUnit == 'mol') {
            convertedValue = value * 2;
          }
          break;
        case 'mol':
          if(nextUnit == 'g') {
            convertedValue = value / 2;
          }
          break;
      }
    }
    console.log("result:" + convertedValue);
    return convertedValue;
  }

  showStructureEditor() {
    this.setState({
      showStructureEditor: true
    })
  }

  hideStructureEditor() {
    this.setState({
      showStructureEditor: false
    })
  }

  updateMolecule(molfile) {
    ElementActions.fetchMoleculeByMolfile(molfile);
  }

  handleStructureEditorSave(molfile) {
    // TODO: handle the resulting molfile and submit it
    console.log("Molecule MOL-file:");
    console.log(molfile);

    // TODO: optimize
    let sample = this.state.sample;
    if(sample) {
      sample.molfile = molfile
    }
    this.setState({sample: sample});
    this.updateMolecule(molfile);
    this.hideStructureEditor()
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor()
  }

  _submitFunction() {
    if(this.state.sample.id == '_new_') {
      this.createSample();
    } else {
      this.updateSample();
    }
  }

  _submitLabel() {
    if(this.state.sample.id == '_new_') {
      return "Create";
    } else {
      return "Save";
    }
  }

  sampleIsValid() {
    let sample = this.state.sample;
    return (sample && sample.molfile) || sample.is_scoped == true
  }

  structureEditorButton(isDisabled) {
    return (
      <Button onClick={this.showStructureEditor.bind(this)} disabled={isDisabled}>
        <Glyphicon glyph='pencil'/>
      </Button>
    )
  }

  // Input Components of Sample Details with scoping
  isDisabled(sample, method) {
    return sample.isRestricted() == true && (sample[method] == undefined && sample.molecule == undefined || sample.molecule[method] == undefined) && sample.id != '_new_'
  }

  topSecretCheckbox(sample) {
    if(!this.isDisabled(sample, 'is_top_secret')) {
      return (
        <Input ref="topSecretInput" type="checkbox" label="Top secret" checked={sample.is_top_secret} onChange={(e) => this.handleTopSecretChanged(e)}/>
      )
    }
  }

  moleculeInput(sample) {
    return (
      <Input type="text" label="Molecule" ref="moleculeInput"
             buttonAfter={this.structureEditorButton(this.isDisabled(sample, 'molecule'))}
             defaultValue={sample.molecule && (sample.molecule.iupac_name || sample.molecule.sum_formular)}
             value={sample.molecule && (sample.molecule.iupac_name || sample.molecule.sum_formular)}
             disabled={this.isDisabled(sample, 'molecule')}
      />
    )
  }

  sampleHeader(sample) {
    let sampleAmount = sample.amount_value && sample.amount_unit ? `(${sample.amount_value} ${sample.amount_unit})` : '';
    let svgPath = sample.molecule && sample.molecule.molecule_svg_file ? `/images/molecules/${sample.molecule.molecule_svg_file}` : '';

    return (
      <table width="100%" height="190px">
        <tr>
          <td width="70%">
            <h3>{sample.name}</h3>
            <h4>{sampleAmount}</h4>
            <ElementCollectionLabels element={sample} key={sample.id}/>
          </td>
          <td width="30%">
            <SVG key={sample.molecule && sample.molecule.id} src={svgPath} className="molecule-mid"/>
          </td>
        </tr>
      </table>
    )
  }

  moleculeInchi(sample) {
    return (
      <Input type="text" label="InChI"
             defaultValue={sample.molecule_inchistring}
             value={sample.molecule_inchistring}
             disabled
      />
    )
  }

  molecularWeight(sample) {
    return (
      <Input type="text" label="M. Weight"
             defaultValue={sample.molecule_molecular_weight}
             value={sample.molecule_molecular_weight}
             disabled
        />
    )
  }

  moleculeDensity(sample) {
    return (
      <Input type="text" label="Density" ref="densityInput"
             value={sample.molecule_density}
             onChange={(e) => this.handleDensityChanged(e)}
             disabled={this.isDisabled(sample, 'density')}
        />
    )
  }

  moleculeFormular(sample) {
    return (
      <Input type="text" label="Formula"
             defaultValue={sample.molecule_formula}
             value={sample.molecule_formula}
             disabled
        />
    )
  }

  moleculeBoilingPoint(sample) {
    return (
      <Input type="text" label="Boiling Point" ref="boilingPointInput"
             value={sample.molecule_boiling_point}
             onChange={(e) => this.handleBoilingPointChanged(e)}
             disabled={this.isDisabled(sample, 'boiling_point')}
        />
    )
  }

  moleculeMeltingPoint(sample) {
    return (
      <Input type="text" label="Melting Point" ref="meltingPointInput"
             value={sample.molecule_melting_point}
             onChange={(e) => this.handleMeltingPointChanged(e)}
             disabled={this.isDisabled(sample, 'melting_point')}
        />
    )
  }

  sampleName(sample) {
    return (
      <Input type="text" label="Name" ref="nameInput"
             placeholder={sample.name}
             value={sample.name}
             onChange={(e) => this.handleNameChanged(e)}
             disabled={this.isDisabled(sample, 'name')}
      />
    )
  }

  sampleImpurities(sample) {
    return (
      <Input type="text" label="Impurities"
             ref="impuritiesInput"
             value={sample.impurities}
             onChange={(e) => this.handleImpuritiesChanged(e)}
             disabled={this.isDisabled(sample, 'impurities')}
        />
    )
  }

  sampleSolvent(sample) {
    return (
      <Select ref='solventInput'
              name='solvents'
              multi={false}
              options={solvents}
              onChange={(e) => this.handleSolventChanged(e)}
              value={sample.solvent}
              disabled={this.isDisabled(sample, 'solvent')}
      />
    )
  }

  sampleAmount(sample) {
    if(this.isDisabled(sample, 'amount_value') == false) {
      return (
        <table><tr>
        <td>
          <NumeralInputWithUnits
            key={sample.id}
            value={sample.amount_mg}
            unit='mg'
            label="mg"
            numeralFormat='0,0.00'
            onChange={(amount) => this.handleAmountChanged(amount)}
            />
        </td>
        <td>
          <NumeralInputWithUnits
            key={sample.id}
            value={sample.amount_ml}
            unit='ml'
            label="ml"
            numeralFormat='0,0.00'
            onChange={(amount) => this.handleAmountChanged(amount)}
            />
        </td>
        <td>
          <NumeralInputWithUnits
            key={sample.id}
            value={sample.amount_mmol}
            unit='mmol'
            label="mmol"
            numeralFormat='0,0.00'
            onChange={(amount) => this.handleAmountChanged(amount)}
            />
        </td>
        </tr></table>
      )
    } else {
      return (
        <Input type="text" label="Amount" disabled value="***" />
      )
    }
  }

  samplePurity(sample) {
    return (
      <Input type="text" label="Purity"
             ref="purityInput"
             value={sample.purity}
             numeralFormat='0,0.00'
             onChange={(e) => this.handlePurityChanged(e)}
             disabled={this.isDisabled(sample, 'purity')}
      />
    )
  }

  sampleLocation(sample) {
    return (
      <Input type="textarea" label="Location"
             ref="locationInput"
             value={sample.location}
             onChange={(e) => this.handleLocationChanged(e)}
             rows={2}
             disabled={this.isDisabled(sample, 'location')}
      />
    )
  }

  sampleDescription(sample) {
    return (
      <Input type="textarea" label="Description" ref="descriptionInput"
             placeholder={sample.description}
             value={sample.description}
             onChange={(e) => this.handleDescriptionChanged(e)}
             rows={2}
             disabled={this.isDisabled(sample, 'description')}
        />
    )
  }

  sampleExternalLabel(sample) {
    return (
      <Input type="text" label="External Label"
             ref="externalLabelInput"
             value={sample.external_label}
             onChange={(e) => this.handleExternalLabelChanged(e)}
             disabled={this.isDisabled(sample, 'external_label')}
      />
    )
  }

  render() {
    let sample = this.state.sample || {}
    let molfile = sample.molfile;
    let sampleIsValid = this.sampleIsValid();

    return (
      <div>
        <StructureEditorModal
          key={sample.id}
          showModal={this.state.showStructureEditor}
          onSave={this.handleStructureEditorSave.bind(this)}
          onCancel={this.handleStructureEditorCancel.bind(this)}
          molfile={molfile}
          />
        <Panel header="Sample Details" bsStyle='primary'>
          {this.sampleHeader(sample)}

          <ListGroup fill>
            <form>
              <ListGroupItem>
                {this.topSecretCheckbox(sample)}

                {this.moleculeInput(sample)}

                <table width="100%">
                  <tr>
                    <td width="50%" className="padding-right">
                      {this.moleculeInchi(sample)}
                    </td>
                    <td width="25%" className="padding-right">
                      {this.molecularWeight(sample)}
                    </td>
                    <td width="25%">
                      {this.moleculeDensity(sample)}
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" className="padding-right">
                      {this.moleculeFormular(sample)}
                    </td>
                    <td width="25%" className="padding-right">
                      {this.moleculeBoilingPoint(sample)}
                    </td>
                    <td width="25%">
                      {this.moleculeMeltingPoint(sample)}
                    </td>
                  </tr>
                </table>
              </ListGroupItem>
              <ListGroupItem>
                <table width="100%">
                  <tr>
                    <td width="50%" className="padding-right" colSpan={2}>
                      {this.sampleName(sample)}
                    </td>
                    <td width="25%" className="padding-right">
                      {this.sampleImpurities(sample)}
                    </td>
                    <td width="25%">
                      <label>Solvent</label>
                      {this.sampleSolvent(sample)}
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" className="padding-right" colSpan={2}>
                      {this.sampleExternalLabel(sample)}
                    </td>
                    <td width="25%" className="padding-right">
                      {this.sampleAmount(sample)}
                    </td>
                    <td width="25%">
                      {this.samplePurity(sample)}
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" colSpan={2} className="padding-right">
                      {this.sampleLocation(sample)}
                    </td>
                    <td width="50%" colSpan={2}>
                      {this.sampleDescription(sample)}
                    </td>
                  </tr>
                </table>

              </ListGroupItem>
              <ListGroupItem>
                <ButtonToolbar>
                  <Button bsStyle="primary" onClick={this.closeDetails.bind(this)}>Close</Button>
                  <Button bsStyle="warning" onClick={this._submitFunction.bind(this)}
                          disabled={!sampleIsValid}>{this._submitLabel()}</Button>
                </ButtonToolbar>
              </ListGroupItem>
            </form>
          </ListGroup>
        </Panel>
      </div>
    )
  }
}

const solvents = [{
  label: 'Aceton',
  value: 'Aceton'
}, {
  label: 'Benzol',
  value: 'Benzol'
}, {
  label: 'Butanol',
  value: 'Butanol'
}, {
  label: 'Chloroform',
  value: 'Chloroform'
}, {
  label: 'Cyclohexan',
  value: 'Cyclohexan'
}, {
  label: 'Diethylether',
  value: 'Diethylether'
}, {
  label: 'Dimethylsulfoxid (DMF)',
  value: 'Dimethylsulfoxid'
}, {
  label: 'Dimethylformamid (DMF)',
  value: 'Dimethylformamid'
}, {
  label: '1,4-Dioxan',
  value: '1,4-Dioxan'
}, {
  label: 'Essigsäure',
  value: 'Essigsäure'
}, {
  label: 'Ethanol',
  value: 'Ethanol'
}, {
  label: 'Ethylacetat',
  value: 'Ethylacetat'
}, {
  label: 'Isopropanol',
  value: 'Isopropanol'
}, {
  label: 'Methanol',
  value: 'Methanol'
}, {
  label: 'Methylenchlorid (DCM)',
  value: 'Methylenchlorid'
}, {
  label: 'Methyl-tert-butylether (MTBE)',
  value: 'Methyl-tert-butylether'
}, {
  label: 'n-Hexan',
  value: 'n-Hexan'
}, {
  label: 'N-Methyl-2-pyrrolidon (NMP)',
  value: 'N-Methyl-2-pyrrolidon'
}, {
  label: 'Pentan',
  value: 'Pentan'
}, {
  label: 'Pyridin',
  value: 'Pyridin'
}, {
  label: 'Tetrahydrofuran (THF)',
  value: 'Tetrahydrofuran'
}, {
  label: 'Toluol',
  value: 'Toluol'
}, {
  label: 'Wasser',
  value: 'Wasser'
}, {
  label: 'CDCl3',
  value: 'CDCl3'
}, {
  label: 'MeOD-d4',
  value: 'MeOD-d4'
}, {
  label: 'C6D6',
  value: 'C6D6'
}, {
  label: 'D2O',
  value: 'D2O'
}];

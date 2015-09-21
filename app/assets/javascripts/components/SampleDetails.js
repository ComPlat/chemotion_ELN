import React from 'react';
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal, Panel, ListGroup, ListGroupItem, Glyphicon} from 'react-bootstrap';
import SVG from 'react-inlinesvg';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

import UIStore from './stores/UIStore';

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
    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  createSampleObject() {
    let uiState = UIStore.getState();
    return {
      id: this.state.sample.id,
      name: this.state.sample.name,
      amount_value: this.state.sample.amount_value,
      amount_unit: this.state.sample.amount_unit,
      description: this.state.sample.description,
      purity: this.state.sample.purity,
      solvent: this.state.sample.solvent,
      impurities: this.state.sample.impurities,
      location: this.state.sample.location,
      molfile: this.state.sample.molfile,
      molecule: this.state.sample.molecule,
      collection_id: uiState.currentCollectionId
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

  handleDescriptionChanged(e) {
    let sample = this.state.sample;
    sample.description = this.refs.descriptionInput.getValue();
    this.setState({
      sample: sample
    });
  }

  handleAmountChanged(amount) {
    let sample = this.state.sample;
    sample.amount_unit = amount.unit;
    sample.amount_value = amount.value;
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
    sample.molecule.density = this.refs.densityInput.getValue();
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
    sample.molecule.boiling_point = this.refs.boilingPointInput.getValue();
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
    sample.molecule.melting_point = this.refs.meltingPointInput.getValue();
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
    this.updateMolecule(molfile);
    let sample = this.state.sample;
    if(sample) {
      sample.molfile = molfile
    }
    this.setState({sample: sample})

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
      return "Save Sample";
    } else {
      return "Update Sample";
    }
  }

  sampleIsValid() {
    let sample = this.state.sample;
    return sample && sample.molfile
  }

  render() {

    let sample = this.state.sample || {}
    let sampleAmount = sample.amount_value && sample.amount_unit ? `(${sample.amount_value} ${sample.amount_unit})` : '';
    let svgPath = sample.molecule && sample.molecule.molecule_svg_file ? `/images/molecules/${sample.molecule.molecule_svg_file}` : '';
    let molfile = sample.molfile;

    let structureEditorButton = (
      <Button onClick={this.showStructureEditor.bind(this)}>
        <Glyphicon glyph='pencil'/>
      </Button>
    )

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
          <ListGroup fill>

            <form>
              <ListGroupItem>
                <Input type="text" label="Molecule" ref="moleculeInput"
                       buttonAfter={structureEditorButton}
                       value={sample.molecule && (sample.molecule.iupac_name || sample.molecule.sum_formular)}
                  />
                <table width="100%">
                  <tr>
                    <td width="50%" className="padding-right">
                      <Input type="text" label="InChI"
                             value={sample.molecule && (sample.molecule.inchistring) }
                             disabled
                        />
                    </td>
                    <td width="25%" className="padding-right">
                      <Input type="text" label="M. Weight"
                             value={sample.molecule && (sample.molecule.molecular_weight) }
                             disabled
                        />
                    </td>
                    <td width="25%">
                      <Input type="text" label="Density" ref="densityInput"
                             value={sample.molecule && (sample.molecule.density) }
                             onChange={(e) => this.handleDensityChanged(e)}
                        />
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" className="padding-right">
                      <Input type="text" label="Formula"
                             value={sample.molecule && (sample.molecule.sum_formular) }
                             disabled
                        />
                    </td>
                    <td width="25%" className="padding-right">
                      <Input type="text" label="Boiling Point" ref="boilingPointInput"
                             value={sample.molecule && (sample.molecule.boiling_point) }
                             onChange={(e) => this.handleBoilingPointChanged(e)}
                        />
                    </td>
                    <td width="25%">
                      <Input type="text" label="Melting Point" ref="meltingPointInput"
                             value={sample.molecule && (sample.molecule.melting_point) }
                             onChange={(e) => this.handleMeltingPointChanged(e)}
                        />
                    </td>
                  </tr>
                </table>
              </ListGroupItem>
              <ListGroupItem>
                <table width="100%">
                  <tr>
                    <td width="50%" className="padding-right" colSpan={2}>
                      <Input type="text" label="Name" ref="nameInput"
                             placeholder={sample.name}
                             value={sample.name}
                             onChange={(e) => this.handleNameChanged(e)}
                        />
                    </td>
                    <td width="25%" className="padding-right">
                      <Input type="text" label="Impurities"
                             ref="impuritiesInput"
                             value={sample.impurities}
                             onChange={(e) => this.handleImpuritiesChanged(e)}
                        />
                    </td>
                    <td width="25%">
                      <label>Solvent</label>
                      <Select ref='solventInput'
                              name='solvents'
                              multi={false}
                              options={solvents}
                              onChange={(e) => this.handleSolventChanged(e)}
                              value={sample.solvent}/>
                    </td>
                  </tr>
                  <tr>
                    <td width="25%" className="padding-right">
                      <Input type="text" label="Weight"
                             value={sample.weight}
                             disabled
                        />
                    </td>
                    <td width="25%" className="padding-right">
                      <Input type="text" label="Volume"
                             value={sample.volume}
                             disabled
                        />
                    </td>
                    <td width="25%" className="padding-right">
                      <NumeralInputWithUnits
                        key={sample.id}
                        value={sample.amount_value}
                        unit={sample.amount_unit || 'g'}
                        label="Amount"
                        units={['g', 'ml', 'mol']}
                        numeralFormat='0,0.00'
                        convertValueFromUnitToNextUnit={(unit, nextUnit, value) => this.handleUnitChanged(unit, nextUnit, value)}
                        onChange={(amount) => this.handleAmountChanged(amount)}
                        />
                    </td>
                    <td width="25%">
                      <Input type="text" label="Purity"
                             ref="purityInput"
                             value={sample.purity}
                             onChange={(e) => this.handlePurityChanged(e)}
                        />
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" colSpan={2} className="padding-right">
                      <Input type="textarea" label="Location"
                             ref="locationInput"
                             value={sample.location}
                             onChange={(e) => this.handleLocationChanged(e)}
                             rows={2}
                        />
                    </td>
                    <td width="50%" colSpan={2}>
                      <Input type="textarea" label="Description" ref="descriptionInput"
                             placeholder={sample.description}
                             value={sample.description}
                             onChange={(e) => this.handleDescriptionChanged(e)}
                             rows={2}
                        />
                    </td>
                  </tr>
                </table>

              </ListGroupItem>
              <ListGroupItem>
                <ButtonToolbar>
                  <Button bsStyle="primary" onClick={this.closeDetails.bind(this)}>Back</Button>
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

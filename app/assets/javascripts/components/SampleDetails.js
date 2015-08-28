import React from 'react';
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal, Panel, ListGroup, ListGroupItem, Glyphicon} from 'react-bootstrap';
import SVG from 'react-inlinesvg';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

import UIStore from './stores/UIStore';

import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementCollectionLabels from './ElementCollectionLabels';

import StructureEditorModal from './structure_editor/StructureEditorModal';

import Aviator from 'aviator';

export default class SampleDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sample: null,
      id: props.id,
      showStructureEditor: false
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
    if(this.state.id) {
      ElementActions.fetchSampleById(this.state.id);
    }
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    if(state.currentElement) {
      this.setState({
        sample: state.currentElement,
        id: state.currentElement.id
      });
    }
  }

  closeDetails() {
    let uiState = UIStore.getState();
    let pagination = uiState.pagination;
    let page = pagination.page && parseInt(pagination.page) || 1;
    let queryParams = page ? {queryParams: { page: page }} : {}
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`, queryParams);
  }

  updateSample() {
    ElementActions.updateSample({
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
      molecule: this.state.sample.molecule
    })
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

  handleSolventChanged(e) {
    let sample = this.state.sample;
    sample.solvent = this.refs.solventInput.getValue();
    this.setState({
      sample: sample
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
    if (unit && nextUnit && unit != nextUnit) {
      switch (unit) {
        case 'g':
          if (nextUnit == 'mol') {
            convertedValue = value * 2;
          }
          break;
        case 'mol':
          if (nextUnit == 'g') {
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

  handleStructureEditorSave(molfile) {
    // TODO: handle the resulting molfile and submit it
    console.log("Molecule MOL-file:");
    console.log(molfile);

    // TODO: optimize
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

  render() {

    let sample = this.state.sample || {}
    let sampleAmount = sample.amount_value && sample.amount_unit ? `(${sample.amount_value} ${sample.amount_unit})` : '';
    let svgPath = sample.molecule && sample.molecule.molecule_svg_file ? `/images/molecules/${sample.molecule.molecule_svg_file}`  : '';
    let molfile = sample.molfile;

    let structureEditorButton = (
      <Button onClick={this.showStructureEditor.bind(this)}>
        <Glyphicon glyph='pencil'/>
      </Button>
    )
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
          <table width="100%" height="190px"><tr>
            <td width="70%">
              <h3>{sample.name}</h3>
              <h4>{sampleAmount}</h4>
              <ElementCollectionLabels element={sample} key={sample.id} />
            </td>
            <td width="30%">
              <SVG key={sample.molecule && sample.molecule.id} src={svgPath} className="molecule-mid"/>
            </td>
          </tr></table>
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
                    <td>
                      <Input type="text" label="Molecular Weight"
                        value={sample.molecule && (sample.molecule.molecular_weight) }
                        disabled
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="padding-right">
                      <Input type="text" label="Formula"
                        value={sample.molecule && (sample.molecule.sum_formular) }
                        disabled
                      />
                    </td>
                    <td>
                      <Input type="text" label="Density" ref="densityInput"
                        value={sample.molecule && (sample.molecule.density) }
                        onChange={(e) => this.handleDensityChanged(e)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="padding-right">
                      <Input type="text" label="Boiling Point" ref="boilingPointInput"
                        value={sample.molecule && (sample.molecule.boiling_point) }
                        onChange={(e) => this.handleBoilingPointChanged(e)}
                      />
                    </td>
                    <td>
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
                    <td width="50%" className="padding-right">
                      <Input type="text" label="Name" ref="nameInput"
                        placeholder={sample.name}
                        value={sample.name}
                        onChange={(e) => this.handleNameChanged(e)}
                      />
                    </td>
                    <td>
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
                  </tr>
                  <tr>
                    <td width="50%" className="padding-right">
                      <Input type="text" label="Impurities"
                        ref="impuritiesInput"
                        value={sample.impurities}
                        onChange={(e) => this.handleImpuritiesChanged(e)}
                      />
                    </td>
                    <td>
                      <Input type="text" label="Purity"
                        ref="purityInput"
                        value={sample.purity}
                        onChange={(e) => this.handlePurityChanged(e)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="padding-right">
                      <Input type="text" label="Weight"
                        value={sample.weight}
                        disabled
                      />
                    </td>
                    <td>
                      <Input type="text" label="Volume"
                        value={sample.volume}
                        disabled
                      />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2}>
                      <Input type='select' label='Solvent' ref="solventInput" onChange={(e) => this.handleSolventChanged(e)} value={sample.solvent}>
                        <option value=''>-- Please Select --</option>
                        <option value='Solvent1'>Solvent1</option>
                        <option value='Solvent2'>Solvent2</option>
                        <option value='Solvent3'>Solvent3</option>
                      </Input>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2}>
                      <Input type="textarea" label="Location"
                        ref="locationInput"
                        value={sample.location}
                        onChange={(e) => this.handleLocationChanged(e)}
                        rows={3}
                      />
                    </td>
                  </tr>
                </table>
                <Input type="textarea" label="Description" ref="descriptionInput"
                  placeholder={sample.description}
                  value={sample.description}
                  onChange={(e) => this.handleDescriptionChanged(e)}
                  rows={3}
                />

              </ListGroupItem>
              <ListGroupItem>
                <ButtonToolbar>
                  <Button bsStyle="primary" onClick={this.closeDetails.bind(this)}>Back</Button>
                  <Button bsStyle="warning" onClick={this.updateSample.bind(this)}>Update Sample</Button>
                </ButtonToolbar>
              </ListGroupItem>
            </form>
          </ListGroup>
        </Panel>
      </div>
    )
  }
}


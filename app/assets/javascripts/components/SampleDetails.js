import React from 'react';
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal, Accordion,
  Panel, ListGroup, ListGroupItem, Glyphicon, TabbedArea, TabPane, Row, Col} from 'react-bootstrap';
import SVG from 'react-inlinesvg';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';

import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import SampleDetailsAnalyses from './SampleDetailsAnalyses';
import Select from 'react-select';

import StructureEditorModal from './structure_editor/StructureEditorModal';

import Aviator from 'aviator';

import {solventOptions} from './staticDropdownOptions/options';

export default class SampleDetails extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      sample: props.sample,
      showStructureEditor: false,
      loadingMolecule: false
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
        sample: state.currentElement,
        loadingMolecule: false
      });
    }
  }

  closeDetails() {
    UIActions.deselectAllElements();

    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  handleSampleChanged(sample) {
    this.setState({
      sample
    });
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
    let sample = this.state.sample;
    if(sample) {
      sample.molfile = molfile
    }
    this.setState({sample: sample, loadingMolecule: true});
    this.updateMolecule(molfile);
    this.hideStructureEditor()
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor()
  }

  _submitFunction() {
    let {sample} = this.state
    console.log(sample.serialize());

    if(sample.isNew) {
      ElementActions.createSample(sample.serialize());
    } else {
      ElementActions.updateSample(sample.serialize());
    }
  }

  _submitLabel() {
    if(this.state.sample.isNew) {
      return "Create";
    } else {
      return "Save";
    }
  }

  sampleIsValid() {
    let sample = this.state.sample;
    return (sample && sample.molfile && !this.state.loadingMolecule) || sample.is_scoped == true;
  }

  structureEditorButton(isDisabled) {
    return (
      <Button onClick={this.showStructureEditor.bind(this)} disabled={isDisabled}>
        <Glyphicon glyph='pencil'/>
      </Button>
    )
  }

  // Input components of sample details should be disabled if detail level does not allow to read their content
  topSecretCheckbox(sample) {
    if(!sample.isMethodDisabled('is_top_secret')) {
      return (
        <Input ref="topSecretInput" type="checkbox" label="Top secret" checked={sample.is_top_secret} onChange={(e) => this.handleTopSecretChanged(e)}/>
      )
    }
  }

  moleculeInput(sample) {
    return (
      <Input type="text" label="Molecule" ref="moleculeInput"
             key={sample.id}
             buttonAfter={this.structureEditorButton(sample.isMethodDisabled('molecule_iupac_name'))}
             defaultValue={sample.molecule && (sample.molecule.iupac_name || sample.molecule.sum_formular)}
             value={sample.molecule && (sample.molecule.iupac_name || sample.molecule.sum_formular)}
             disabled={sample.isMethodDisabled('molecule_iupac_name')}
      />
    )
  }

  svgOrLoading(sample) {
    let svgPath = "";
    if (this.state.loadingMolecule) {
      svgPath = "/images/loading-bubbles.svg";
    } else {
      svgPath = sample.molecule && sample.molecule.molecule_svg_file ? `/images/molecules/${sample.molecule.molecule_svg_file}` : '';
    }
    return (<SVG key={svgPath} src={svgPath} className="molecule-mid"/>);
  }

  sampleHeader(sample) {
    let sampleMoleculeMolecularWeight = sample.molecule_molecular_weight ? `(${sample.molecule_molecular_weight} mg/mmol)` : '';
    const style = {height: '200px'};
    return (
      <Row style={style}>
        <Col md={7}>
          <h3>{sample.title()}</h3>
          <h4>{sample.molecule.iupac_name}</h4>
          <h5>{sampleMoleculeMolecularWeight}</h5>
          <ElementCollectionLabels element={sample} key={sample.id}/>
          <ElementAnalysesLabels element={sample} key={sample.id+"_analyses"}/>
        </Col>
        <Col md={5}>
          {this.svgOrLoading(sample)}
        </Col>
      </Row>
    )
  }

  moleculeInchi(sample) {
    return (
      <Input type="text" label="InChI"
             key={sample.id}
             defaultValue={sample.molecule_inchistring}
             value={sample.molecule_inchistring}
             disabled
      />
    )
  }

  molecularWeight(sample) {
    return (
      <Input type="text" label="M. Weight"
             key={sample.id}
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
             disabled={sample.isMethodDisabled('molecule_density')}
        />
    )
  }

  moleculeFormular(sample) {
    return (
      <Input type="text" label="Formula"
             key={sample.id}
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
             disabled={sample.isMethodDisabled('molecule_boiling_point')}
        />
    )
  }

  moleculeMeltingPoint(sample) {
    return (
      <Input type="text" label="Melting Point" ref="meltingPointInput"
             value={sample.molecule_melting_point}
             onChange={(e) => this.handleMeltingPointChanged(e)}
             disabled={sample.isMethodDisabled('molecule_melting_point')}
        />
    )
  }

  sampleName(sample) {
    return (
      <Input type="text" label="Name" ref="nameInput"
             placeholder={sample.name}
             value={sample.name}
             onChange={(e) => this.handleNameChanged(e)}
             disabled={sample.isMethodDisabled('name')}
      />
    )
  }

  sampleImpurities(sample) {
    return (
      <Input type="text" label="Impurities"
             ref="impuritiesInput"
             value={sample.impurities}
             onChange={(e) => this.handleImpuritiesChanged(e)}
             disabled={sample.isMethodDisabled('impurities')}
        />
    )
  }

  sampleSolvent(sample) {
    return (
      <Select ref='solventInput'
              name='solvents'
              multi={false}
              options={solventOptions}
              onChange={(e) => this.handleSolventChanged(e)}
              value={sample.solvent}
              disabled={sample.isMethodDisabled('solvent')}
      />
    )
  }

  sampleAmount(sample) {
    if(sample.isMethodDisabled('amount_value') == false) {
      if(sample.isMethodRestricted('molecule') == true) {
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
          </tr></table>
        )
      } else {
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
      }
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
             disabled={sample.isMethodDisabled('purity')}
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
             disabled={sample.isMethodDisabled('location')}
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
             disabled={sample.isMethodDisabled('description')}
        />
    )
  }

  sampleExternalLabel(sample) {
    return (
      <Input type="text" label="External Label"
             ref="externalLabelInput"
             value={sample.external_label}
             onChange={(e) => this.handleExternalLabelChanged(e)}
             disabled={sample.isMethodDisabled('external_label')}
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
        <Panel header="Sample Details" bsStyle={sample.isEdited ? 'info' : 'primary'}>
          {this.sampleHeader(sample)}
          <ListGroup>
          <TabbedArea defaultActiveKey={0}>
            <TabPane eventKey={0} tab={'Properties'}>
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
            </TabPane>
            <TabPane eventKey={1} tab={'Analyses'} key={sample.id}>
              <ListGroupItem style={{paddingBottom: 20}}>
                <SampleDetailsAnalyses
                  sample={sample}
                  onSampleChanged={sample => this.handleSampleChanged(sample)}
                  />
              </ListGroupItem>
            </TabPane>
          </TabbedArea>
              <ListGroupItem>
                <ButtonToolbar>
                  <Button bsStyle="primary" onClick={this.closeDetails.bind(this)}>Close</Button>
                  <Button bsStyle="warning" onClick={this._submitFunction.bind(this)}
                          disabled={!sampleIsValid}>{this._submitLabel()}</Button>
                </ButtonToolbar>
              </ListGroupItem>
          </ListGroup>
        </Panel>
      </div>
    )
  }
}

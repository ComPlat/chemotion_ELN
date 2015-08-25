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
      molfile: this.state.sample.molfile
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
    let svgPath = sample.molecule && sample.molecule.molecule_svg_file ? `/assets/${sample.molecule.molecule_svg_file}`  : '';
    let molfile = sample.molfile;

    console.log(molfile);

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
              </ListGroupItem>
              <ListGroupItem>
                <Input type="text" label="Name" ref="nameInput"
                  placeholder={sample.name}
                  value={sample.name}
                  onChange={(e) => this.handleNameChanged(e)}
                />
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


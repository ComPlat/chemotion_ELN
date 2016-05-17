import React from 'react';
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal,
        Accordion, Panel, ListGroup, ListGroupItem, Glyphicon, Tabs, Tab,
        FormGroup, Row, Col} from 'react-bootstrap';
import SVG from 'react-inlinesvg';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';


import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import SampleDetailsAnalyses from './SampleDetailsAnalyses';
import extra from "./extra/SampleDetailsExtra"
import Select from 'react-select';
import StickyDiv from 'react-stickydiv'

import StructureEditorModal from './structure_editor/StructureEditorModal';

import Aviator from 'aviator';

import {solventOptions} from './staticDropdownOptions/options';
import Sample from './models/Sample';
import PolymerSection from './PolymerSection';
import ElementalCompositionGroup from './ElementalCompositionGroup';
import ToggleSection from './common/ToggleSection'
import SampleName from './common/SampleName'
import SampleForm from './SampleForm'

const MWPrecision = 6;

export default class SampleDetails extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      sample: props.sample,
      reaction: null,
      materialGroup: null,
      showStructureEditor: false,
      loadingMolecule: false,
      showElementalComposition: false
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
        reaction: state.currentReaction,
        materialGroup: state.currentMaterialGroup,
        samplePanelFixed: false,
        loadingMolecule: false
      });
    }
  }

  handleSampleChanged(sample) {
    this.setState({
      sample
    });
  }

  handleAmountChanged(amount) {
    let sample = this.state.sample;
    sample.setAmountAndNormalizeToGram(amount);
    this.setState({
      sample: sample
    });
  }

  handleImportedReadoutChanged(e) {
    let sample = this.state.sample;
    sample.imported_readout = this.refs.importedReadoutInput.getValue();
    this.setState({
      sample: sample
    });
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

  updateMolecule(molfile, svg_file = null) {
    ElementActions.fetchMoleculeByMolfile(molfile, svg_file);
  }

  handleStructureEditorSave(molfile, svg_file = null) {
    let {sample} = this.state;

    if(sample) {
      sample.molfile = molfile

      sample.contains_residues = molfile.indexOf(' R# ') > -1;

      if(sample.contains_residues)
        sample.sample_svg_file = svg_file;

      sample.formulaChanged = true;
    }
    this.setState({sample: sample, loadingMolecule: true});

    if(sample.contains_residues > -1){
      this.updateMolecule(molfile, svg_file);
    } else {
      this.updateMolecule(molfile);
    }

    this.hideStructureEditor()
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor()
  }

  _submitFunction() {
  let {sample, reaction, materialGroup} = this.state;

  if(reaction) {
    ElementActions.createSampleForReaction(sample);
    } else {
      if(sample.isNew) {
        ElementActions.createSample(sample);
      } else {
        ElementActions.updateSample(new Sample(sample));
      }
    }
  }

  closeDetails() {
    let { currentReaction } = ElementStore.getState();
    let {sample} = this.state;

    if(currentReaction) {
      if(sample.isNew)
        ElementActions.openReactionDetails(currentReaction);
      else
        ElementActions.fetchReactionById(currentReaction)
    } else {
      UIActions.deselectAllElements();

      let uiState = UIStore.getState();
      Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
    }
  }

  structureEditorButton(isDisabled) {
    return (
      <Button onClick={this.showStructureEditor.bind(this)} disabled={isDisabled}>
        <Glyphicon glyph='pencil'/>
      </Button>
    )
  }

  svgOrLoading(sample) {
    let svgPath = "";
    if (this.state.loadingMolecule) {
      svgPath = "/images/loading-bubbles.svg";
    } else {
      svgPath = sample.svgPath;
    }
    let className = svgPath ? 'svg-container' : 'svg-container-empty'
    return (
      <div className={className}
           onClick={this.showStructureEditor.bind(this)}>
        <Glyphicon className="pull-right" glyph='pencil'/>
        <SVG key={svgPath} src={svgPath} className="molecule-mid"/>
      </div>
    );
  }

  sampleAverageMW(sample) {
    let mw = sample.molecule_molecular_weight;
    if(mw)
      return `${mw.toFixed(MWPrecision)} g/mol`;
    else
      return '';
  }

  sampleExactMW(sample) {
    let mw = sample.molecule_exact_molecular_weight
    if(mw)
      return `Exact mass: ${mw.toFixed(MWPrecision)} g/mol`;
    else
      return '';
  }

  sampleHeader(sample) {
    const style = {height: '200px'};
    return (
      <Row style={style}>
        <Col md={4}>
          <h3>{sample.title()}</h3>
          <h4><SampleName sample={sample}/></h4>
          <h5>{this.sampleAverageMW(sample)}</h5>
          <h5>{this.sampleExactMW(sample)}</h5>
          <ElementCollectionLabels element={sample} key={sample.id}/>
          <ElementAnalysesLabels element={sample} key={sample.id+"_analyses"}/>
          {this.extraLabels().map((Lab,i)=><Lab key={i} element={sample}/>)}
        </Col>
        <Col md={8}>
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
             disabled
             readOnly
      />
    )
  }

  handleSectionToggle() {
    this.setState({showElementalComposition: !this.state.showElementalComposition});
  }

  elementalPropertiesItemHeader(sample) {
    let label
    if(sample.contains_residues) {
      label = 'Polymer section'
      if(!this.state.showElementalComposition)
        label += ' / Elemental composition';
    }
    else
      label = 'Elemental composition';

    return (
      <ListGroupItem onClick={() => this.handleSectionToggle()}>
        <Col className="padding-right elem-composition-header" md={6}>
          <label>{label}</label>
        </Col>
        <div className="col-md-6">
          <ToggleSection show={this.state.showElementalComposition}/>
        </div>
      </ListGroupItem>
    )
  }

  elementalPropertiesItemContent(sample, materialGroup, show) {
    if(!show)
      return false;

    if(sample.contains_residues)
      return (
        <ListGroupItem className="ea-section">
          <PolymerSection sample={sample}
                          parent={this}
                          show={sample.contains_residues}
                          materialGroup={materialGroup}/>
        </ListGroupItem>
      )
    else
      return (
        <ListGroupItem className="ea-section">
          <Row>
            <Col md={6}>
              <ElementalCompositionGroup sample={sample}/>
            </Col>
          </Row>
        </ListGroupItem>
      )
  }

  elementalPropertiesItem(sample) {
    if(!sample.molecule.sum_formular) { // avoid empty ListGroupItem
      return false;
    } else {
      let show = this.state.showElementalComposition;
      let materialGroup = this.state.materialGroup;

      return(
        <div width="100%" className="polymer-section">
          {this.elementalPropertiesItemHeader(sample)}

          {this.elementalPropertiesItemContent(sample, materialGroup, show)}
        </div>
      )
    }
  }

  samplePropertiesTab(ind){
    let sample = this.state.sample || {};

    return(
      <Tab eventKey={ind} title={'Properties'} key={'Props' + sample.id.toString()}>
        <ListGroupItem>
          <SampleForm sample={sample}
                      parent={this}/>
        </ListGroupItem>
        {this.elementalPropertiesItem(sample)}
        <ListGroupItem>
          {this.moleculeInchi(sample)}
        </ListGroupItem>
      </Tab>
    )
  }

  sampleAnalysesTab(ind){
    let sample = this.state.sample || {}
    return(
      <Tab eventKey={ind} title={'Analyses'} key={'Analyses' + sample.id.toString()}>
        <ListGroupItem style={{paddingBottom: 20}}>
          <SampleDetailsAnalyses
            sample={sample}
            parent={this}
            />
        </ListGroupItem>
      </Tab>
    )
  }

  sampleImportReadoutTab(ind){
    let sample = this.state.sample || {}
    return(
      <Tab eventKey={ind} title={'Results'} key={'Results' + sample.id.toString()}>
        <ListGroupItem style={{paddingBottom: 20}}>
        <Input type="text" label="Imported Readout"
           ref="importedReadoutInput"
           value={sample.imported_readout || ''}
           disabled
           readOnly
        />
        </ListGroupItem>
      </Tab>
    )
  }

  extraTab(ind){
    let sample = this.state.sample || {}
    let num = ind - 3 ;
    let NoName =  extra["Tab"+num];
    let TabName = extra["TabName"+num];
    return(
       <Tab eventKey={ind} key={ind} title={TabName} >
         <ListGroupItem style={{paddingBottom: 20}}>
           <NoName  sample={sample}/>
         </ListGroupItem>
       </Tab>
      )
  }
  extraLabels(){
    let labels = [];
    for (let j=0;j < extra.LabelsCount;j++){
      labels.push(extra["Labels"+j])
    }
    return labels;
  }

  render() {
    let sample = this.state.sample || {}
    let molfile = sample.molfile;
    let tabContents = [
                       (i)=>(this.samplePropertiesTab(i)),
                       (i)=>(this.sampleAnalysesTab(i)),
                       (i)=>(this.sampleImportReadoutTab(i))
                      ];
    for (let j=0;j < extra.TabCount;j++){
      tabContents.push((i)=>this.extraTab(i))
    }

    return (
      <div>
        <StructureEditorModal
          key={sample.id}
          showModal={this.state.showStructureEditor}
          onSave={this.handleStructureEditorSave.bind(this)}
          onCancel={this.handleStructureEditorCancel.bind(this)}
          molfile={molfile}
          />
        <StickyDiv zIndex={2}>
          <Panel className="panel-fixed"
                 header="Sample Details"
                 bsStyle={sample.isEdited ? 'info' : 'primary'}>
            <Button bsStyle="danger" bsSize="xsmall" className="button-right" onClick={this.closeDetails.bind(this)}>
              <i className="fa fa-times"></i>
            </Button>
            {this.sampleHeader(sample)}
            <ListGroup>
            <Tabs defaultActiveKey={0}>
              {tabContents.map((e,i)=>e(i))}
            </Tabs>
            </ListGroup>
          </Panel>
        </StickyDiv>
      </div>
    )
  }
}

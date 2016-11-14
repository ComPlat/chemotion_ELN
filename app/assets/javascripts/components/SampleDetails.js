import React from 'react';
import {Button, ButtonToolbar, InputGroup, ControlLabel, FormGroup, FormControl,
        Panel, ListGroup, ListGroupItem, Glyphicon, Tabs, Tab, Row, Col,
        Tooltip, OverlayTrigger} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import Clipboard from 'clipboard';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';

import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import ElementReactionLabels from './ElementReactionLabels';
import SampleDetailsAnalyses from './SampleDetailsAnalyses';

import XLabels from "./extra/SampleDetailsXLabels";
import XTab from "./extra/SampleDetailsXTab";
import XTabName from "./extra/SampleDetailsXTabName";

import StructureEditorModal from './structure_editor/StructureEditorModal';

import Aviator from 'aviator';

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
      showElementalComposition: false,
    }

    this.clipboard = new Clipboard('.clipboardBtn');
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      sample: nextProps.sample,
      loadingMolecule: false,
    });
  }

  componentWillUnmount() {
    this.clipboard.destroy();
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
    sample.imported_readout = e.target.value
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

    sample.molfile = molfile
    sample.contains_residues = molfile.indexOf(' R# ') > -1;
    sample.formulaChanged = true;

    this.setState({sample: sample, loadingMolecule: true});

    this.updateMolecule(molfile, svg_file);

    this.hideStructureEditor()
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor()
  }

  handleSubmit(closeView = false) {
    let {sample} = this.state;
    if(sample.belongTo && sample.belongTo.type === 'reaction') {
      let reaction = sample.belongTo;
      reaction.editedSample = sample;
      const materialGroup = sample.matGroup;
      if(sample.isNew) {
        ElementActions.createSampleForReaction(sample, reaction, materialGroup);
      } else {
        if(closeView) {
          ElementActions.updateSampleForReaction(sample, reaction);
        } else {
          ElementActions.updateSample(new Sample(sample));
        }
      }
    } else if(sample.belongTo && sample.belongTo.type === 'wellplate') {
      const wellplate = sample.belongTo;
      ElementActions.updateSampleForWellplate(sample, wellplate)
    } else {
      if(sample.isNew) {
        ElementActions.createSample(sample)
      } else {
        ElementActions.updateSample(new Sample(sample))
      }
    }
    if(sample.is_new || closeView) {
      const force = true;
      this.props.closeDetails(sample, force);
    }
    sample.updateChecksum();
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
    let saveBtnDisplay = sample.isEdited ? '' : 'none'
    return (
      <div>
        <i className="icon-sample" /> {sample.title()}
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="closeSample">Close Sample</Tooltip>}>
          <Button bsStyle="danger" bsSize="xsmall" className="button-right"
            onClick={() => this.props.closeDetails(sample)}>
            <i className="fa fa-times"></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveSample">Save Sample</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
            onClick={() => this.handleSubmit()}
            style={{display: saveBtnDisplay}}
            disabled={!this.sampleIsValid()} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
        <Button bsStyle="info" bsSize="xsmall" className="button-right"
          onClick={() => this.props.toggleFullScreen()}>
          <i className="fa fa-expand"></i>
        </Button>
        </OverlayTrigger>
        <div style={{display: "inline-block", marginLeft: "10px"}}>
          <ElementReactionLabels element={sample} key={sample.id + "_reactions"}/>
          <ElementCollectionLabels element={sample} key={sample.id} placement="right"/>
          <ElementAnalysesLabels element={sample} key={sample.id+"_analyses"}/>
          {this.extraLabels().map((Lab,i)=><Lab key={i} element={sample}/>)}
        </div>
      </div>
    )
  }

  sampleInfo(sample) {
    const style = {height: '200px'};
    return (
      <Row style={style}>
        <Col md={4}>
          <h4><SampleName sample={sample}/></h4>
          <h5>{this.sampleAverageMW(sample)}</h5>
          <h5>{this.sampleExactMW(sample)}</h5>
        </Col>
        <Col md={8}>
          {this.svgOrLoading(sample)}
        </Col>
      </Row>
    )
  }

  moleculeInchi(sample) {
    return (
      <FormGroup >
        <ControlLabel></ControlLabel>
        <InputGroup>
          <InputGroup.Addon>InChI</InputGroup.Addon>
          <FormControl type="text"
             key={sample.id}
             defaultValue={sample.molecule_inchistring || ''}
             disabled
             readOnly
          />
          <InputGroup.Button>
            <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
              <Button active className="clipboardBtn" data-clipboard-text={sample.molecule_inchistring || " "} >
                <i className="fa fa-clipboard"></i>
              </Button>
            </OverlayTrigger>
          </InputGroup.Button>
        </InputGroup>
      </FormGroup>
    )
  }

  clipboardTooltip() {
    return(
      <Tooltip id="assign_button">copy to clipboard</Tooltip>
    )
  }

  moleculeCanoSmiles(sample) {
    return (
      <FormGroup >
        <ControlLabel></ControlLabel>
        <InputGroup>
          <InputGroup.Addon>Canonical Smiles</InputGroup.Addon>
          <FormControl type="text"
             defaultValue={sample.molecule_cano_smiles || ''}
             disabled
             readOnly
          />
          <InputGroup.Button>
            <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
              <Button active className="clipboardBtn" data-clipboard-text={sample.molecule_cano_smiles || " "} >
                <i className="fa fa-clipboard"></i>
              </Button>
            </OverlayTrigger>
          </InputGroup.Button>
        </InputGroup>
      </FormGroup>
    )
  }

  handleSectionToggle() {
    this.setState({
      showElementalComposition: !this.state.showElementalComposition
    });
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
    // avoid empty ListGroupItem
    if(!sample.molecule.sum_formular)
      return false;

    let show = this.state.showElementalComposition;
    let materialGroup = this.state.materialGroup;

    return(
      <div width="100%" className="polymer-section">
        {this.elementalPropertiesItemHeader(sample)}

        {this.elementalPropertiesItemContent(sample, materialGroup, show)}
      </div>
    )

  }

  samplePropertiesTab(ind){
    let sample = this.state.sample || {};

    return(
      <Tab eventKey={ind} title={'Properties'}
        key={'Props' + sample.id.toString()}>
        <ListGroupItem>
          <SampleForm sample={sample}
                      parent={this}/>
        </ListGroupItem>
        {this.elementalPropertiesItem(sample)}
        <ListGroupItem>
          {this.moleculeInchi(sample)}
          {this.moleculeCanoSmiles(sample)}
        </ListGroupItem>
      </Tab>
    )
  }

  sampleAnalysesTab(ind){
    let sample = this.state.sample || {}
    return(
      <Tab eventKey={ind} title={'Analyses'}
        key={'Analyses' + sample.id.toString()}>
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
      <Tab eventKey={ind} title={'Results'}
        key={'Results' + sample.id.toString()}>
        <ListGroupItem style={{paddingBottom: 20}}>
        <FormGroup controlId="importedReadoutInput">
          <ControlLabel>Imported Readout</ControlLabel>
          <InputGroup>
            <FormControl type="text"
              ref="importedReadoutInput"
              value={sample.imported_readout || ''}
             disabled
             readOnly
            />
          </InputGroup>
        </FormGroup>
        </ListGroupItem>
      </Tab>
    )
  }

  extraTab(ind){
    let sample = this.state.sample || {}
    let num = ind - 3 ;
    let NoName =  XTab["Tab"+num];
    let TabName = XTabName["TabName"+num];
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
    for (let j=0;j < XLabels.LabelsCount;j++){
      labels.push(XLabels["Labels"+j])
    }
    return labels;
  }

  sampleIsValid() {
    const {sample, loadingMolecule} = this.state;
    return (sample.isValid && !loadingMolecule) || sample.is_scoped == true;
  }

  saveBtn(sample, closeView = false) {
    let submitLabel = (sample && sample.isNew) ? "Create" : "Save";

    if(closeView) submitLabel += ' and close';

    return (
      <Button bsStyle="warning"
              onClick={() => this.handleSubmit(closeView)}
              disabled={!this.sampleIsValid()}>
              {submitLabel}
      </Button>
    )
  }

  sampleFooter() {
    const {sample} = this.state;
    const belongToReaction = sample.belongTo && sample.belongTo.type === 'reaction';

    let saveAndCloseBtn = belongToReaction && !sample.isNew
                            ?
                              this.saveBtn(sample, true)
                            :
                              null;
    return (
      <ButtonToolbar>
        <Button bsStyle="primary"
                onClick={() => this.props.closeDetails(sample)}>
          Close
        </Button>
        {this.saveBtn(sample)}
        {saveAndCloseBtn}
      </ButtonToolbar>
    )
  }

  structureEditorModal(sample) {
    const molfile = sample.molfile;
    const hasParent = sample && sample.parent_id;
    const hasChildren = sample && sample.children_count > 0;
    return(
      <StructureEditorModal
        key={sample.id}
        showModal={this.state.showStructureEditor}
        onSave={this.handleStructureEditorSave.bind(this)}
        onCancel={this.handleStructureEditorCancel.bind(this)}
        molfile={molfile}
        hasParent={hasParent}
        hasChildren={hasChildren} />
    )
  }

  render() {
    let sample = this.state.sample || {}
    let tabContents = [
                       (i)=>(this.samplePropertiesTab(i)),
                       (i)=>(this.sampleAnalysesTab(i)),
                       (i)=>(this.sampleImportReadoutTab(i))
                      ];
    for (let j=0;j < XTab.TabCount;j++){
      tabContents.push((i)=>this.extraTab(i))
    }

    return (
      <Panel className="panel-detail"
             header={this.sampleHeader(sample)}
             bsStyle={sample.isPendingToSave ? 'info' : 'primary'}>
        {this.sampleInfo(sample)}
        <ListGroup>
        <Tabs defaultActiveKey={0} id="SampleDetailsXTab">
          {tabContents.map((e,i)=>e(i))}
        </Tabs>
        </ListGroup>
        {this.sampleFooter()}
        {this.structureEditorModal(sample)}
      </Panel>
    )
  }
}
SampleDetails.propTypes = {
  sample: React.PropTypes.object,
  closeDetails: React.PropTypes.func,
  toggleFullScreen: React.PropTypes.func,
}

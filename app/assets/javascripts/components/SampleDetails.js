import React from 'react';
import {Button, ButtonToolbar, InputGroup, Form, FormGroup, FormControl,
        Panel, ListGroup, ListGroupItem, Glyphicon, Tabs, Tab, Row, Col,
        Tooltip, OverlayTrigger, DropdownButton, MenuItem, SplitButton,
        ControlLabel, ButtonGroup, Grid} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import Clipboard from 'clipboard';
import Barcode from 'react-barcode';
import Select from 'react-select';
import _ from 'lodash';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';
import DetailActions from './actions/DetailActions';

import UIStore from './stores/UIStore';
import UserStore from './stores/UserStore';
import UIActions from './actions/UIActions';

import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import PubchemLabels from './PubchemLabels';
import ElementReactionLabels from './ElementReactionLabels';
import SampleDetailsContainers from './SampleDetailsContainers';

import XLabels from "./extra/SampleDetailsXLabels";
import XTabs from "./extra/SampleDetailsXTabs";

import StructureEditorModal from './structure_editor/StructureEditorModal';

import Aviator from 'aviator';

import Sample from './models/Sample';
import Container from './models/Container'
import PolymerSection from './PolymerSection';
import ElementalCompositionGroup from './ElementalCompositionGroup';
import ToggleSection from './common/ToggleSection'
import SampleName from './common/SampleName'
import SampleForm from './SampleForm'
import ComputedPropsContainer from './computed_props/ComputedPropsContainer';
import Utils from './utils/Functions';
import PrintCodeButton from './common/PrintCodeButton'
import SampleDetailsLiteratures from './DetailsTabLiteratures';

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
      activeTab: UIStore.getState().sample.activeTab,
      qrCodeSVG: "",
      isCasLoading: false,
    };

    const data = UserStore.getState().profile.data || {};
    this.enableComputedProps = _.get(data, 'computed_props.enable', false);

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.clipboard = new Clipboard('.clipboardBtn');
    this.addManualCas = this.addManualCas.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      sample: nextProps.sample,
      loadingMolecule: false,
      isCasLoading: false,
    });
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange)
  }

  componentWillUnmount() {
    this.clipboard.destroy();
    UIStore.unlisten(this.onUIStoreChange)
  }

  onUIStoreChange(state) {
    if (state.sample.activeTab != this.state.activeTab){
      this.setState((previousState)=>{ return {
        ...previousState, activeTab: state.sample.activeTab
      }})
    }
  }

  handleSampleChanged(sample) {
    this.setState({
      sample
    });
  }

  handleAmountChanged(amount) {
    const sample = this.state.sample;
    sample.setAmountAndNormalizeToGram(amount);
    this.setState({ sample });
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
    const { sample } = this.state;
    if (sample.belongTo && sample.belongTo.type === 'reaction') {
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
      DetailActions.close(sample, true);
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
      svgPath = "/images/wild_card/loading-bubbles.svg";
    } else {
      svgPath = sample.svgPath;
    }
    let className = svgPath ? 'svg-container' : 'svg-container-empty'
    return (
      sample.can_update
        ? <div className={className}
               onClick={this.showStructureEditor.bind(this)}>
            <Glyphicon className="pull-right" glyph='pencil'/>
            <SVG key={svgPath} src={svgPath} className="molecule-mid"/>
          </div>
        : <div className={className}>
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

  sampleQrCode() {
    let uuid = this.state.sample.code_log && this.state.sample.code_log.id
    return uuid
     ? <SVG  src={`/images/qr/${uuid}.v1_l.svg`} className="qr-svg"/>
     : null
  }

  sampleBarCode(sample) {
    let barCode = sample.code_log && sample.code_log.value_sm
    if(barCode != null)
      return <Barcode
                value={barCode}
                width={1}
                height={80}
                fontSize={13}
                margin={0}/>;
    else
      return '';
  }


  initiateAnalysisButton(sample) {
    return (
      <div style={{display: "inline-block", marginLeft: "100px"}}>
        <DropdownButton id="InitiateAnalysis" bsStyle="info" bsSize="xsmall" title="Initiate Analysis">
          <MenuItem eventKey="1" onClick={() => this.initiateAnalysisWithKind(sample, "1H NMR")}>1H NMR</MenuItem>
          <MenuItem eventKey="2" onClick={() => this.initiateAnalysisWithKind(sample, "13C NMR")}>13C NMR</MenuItem>
          <MenuItem eventKey="3" onClick={() => this.initiateAnalysisWithKind(sample, "Others")}>others</MenuItem>
          <MenuItem eventKey="4" onClick={() => this.initiateAnalysisWithKind(sample, "Others2x")}>others 2x</MenuItem>
          <MenuItem eventKey="5" onClick={() => this.initiateAnalysisWithKind(sample, "Others3x")}>others 3x</MenuItem>
        </DropdownButton>
      </div>
    )
  }

  initiateAnalysisWithKind(sample, kind) {
    let analysis = Container.buildAnalysis(kind),
              a1 = Container.buildAnalysis(),
              a2 = Container.buildAnalysis(),
              a3 = Container.buildAnalysis();
    switch(kind) {
      case "1H NMR": case "13C NMR":
        sample.addAnalysis(analysis);
        ElementActions.updateSample(sample);
        Utils.downloadFile({contents: "api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + analysis.id + "&type=nmr_analysis&size=small"})
        break;
      case "Others":
        sample.addAnalysis(a1);
        ElementActions.updateSample(sample);
        Utils.downloadFile({contents: "api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + a1.id + "&type=analysis&size=small"})
        break;
      case "Others2x":
        sample.addAnalysis(a1);
        sample.addAnalysis(a2);
        ElementActions.updateSample(sample);
        Utils.downloadFile({contents: "api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + a1.id + "&analyses_ids[]=" + a2.id  + "&type=analysis&size=small"})
        break;
      case "Others3x":
        sample.addAnalysis(a1);
        sample.addAnalysis(a2);
        sample.addAnalysis(a3);
        ElementActions.updateSample(sample);
        Utils.downloadFile({contents: "api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + a1.id + "&analyses_ids[]=" + a2.id + "&analyses_ids[]=" + a3.id + "&type=analysis&size=small"})
        break;
    }
  }

  sampleHeader(sample) {
    let saveBtnDisplay = sample.isEdited ? '' : 'none'
    return (
      <div>
        <i className="icon-sample" /> {sample.title()}
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="closeSample">Close Sample</Tooltip>}>
          <Button bsStyle="danger" bsSize="xsmall" className="button-right"
            onClick={() => DetailActions.close(sample)}>
            <i className="fa fa-times"></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveCloseSample">Save and Close Sample</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
            onClick={() => this.handleSubmit(true)}
            style={{display: saveBtnDisplay}}
            disabled={!this.sampleIsValid() || !sample.can_update} >
            <i className="fa fa-floppy-o" />
            <i className="fa fa-times"  />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveSample">Save Sample</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
            onClick={() => this.handleSubmit()}
            style={{display: saveBtnDisplay}}
            disabled={!this.sampleIsValid() || !sample.can_update} >
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
        <PrintCodeButton element={sample}/>
        <div style={{display: "inline-block", marginLeft: "10px"}}>
          <ElementReactionLabels element={sample} key={sample.id + "_reactions"}/>
          <ElementCollectionLabels element={sample} key={sample.id} placement="right"/>
          <ElementAnalysesLabels element={sample} key={sample.id+"_analyses"}/>
          <PubchemLabels element={sample} />
          {this.extraLabels().map((Lab,i)=><Lab key={i} element={sample}/>)}
        </div>

      </div>
    )
  }

  transferToDeviceButton(sample) {
    return (
      <Button bsSize="xsmall"
        onClick={() => {
          const {selectedDeviceId, devices} = ElementStore.getState().elements.devices
          const device = devices.find((d) => d.id === selectedDeviceId)
          ElementActions.addSampleToDevice(sample, device, {save: true})
        }}
        style={{marginLeft: 25}}
      >
        Transfer to Device
      </Button>
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
          <Col md={6}>
            {this.sampleBarCode(sample)}
          </Col>
          <Col md={6}>
            {this.sampleQrCode()}
          </Col>
        </Col>
        <Col md={8}>
          {this.svgOrLoading(sample)}
        </Col>
      </Row>
    )
  }

  moleculeInchi(sample) {
    return (
      <InputGroup className='sample-molecule-identifier'>
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
    )
  }

  clipboardTooltip() {
    return(
      <Tooltip id="assign_button">copy to clipboard</Tooltip>
    )
  }

  moleculeCanoSmiles(sample) {
    return (
      <InputGroup className='sample-molecule-identifier'>
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
    )
  }

  addManualCas(e) {
    DetailActions.updateMoleculeCas(this.props.sample, e.value);
  }

  moleculeCas() {
    const { sample, isCasLoading } = this.state;
    const { molecule, xref } = sample;
    const cas = xref ? xref.cas : "";
    const casLabel = cas && cas.label ? cas.label : "";
    let casArr = [];
    if(molecule && molecule.cas) {
      casArr = molecule.cas.map(c => Object.assign({label: c}, {value: c}));
    }
    const onChange = e => this.updateCas(e);
    const onOpen = e => this.onCasSelectOpen(e, casArr);

    return (
      <InputGroup className='sample-molecule-identifier'>
        <InputGroup.Addon>CAS</InputGroup.Addon>
        <Select.Creatable
          name='cas'
          multi={false}
          options={casArr}
          onChange={onChange}
          onOpen={onOpen}
          onNewOptionClick={this.addManualCas}
          isLoading={isCasLoading}
          value={cas}
          disabled={!sample.can_update}
        />
        <InputGroup.Button>
          <OverlayTrigger placement="bottom"
                          overlay={this.clipboardTooltip()} >
            <Button active className="clipboardBtn"
                    data-clipboard-text={casLabel} >
              <i className="fa fa-clipboard"></i>
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
      </InputGroup>
    )
  }

  updateCas(e) {
    let sample = this.state.sample;
    sample.xref = { ...sample.xref, cas: e };
    this.setState({sample});
  }

  onCasSelectOpen(e, casArr) {
    if(casArr.length === 0) {
      this.setState({isCasLoading: true})
      DetailActions.getMoleculeCas(this.state.sample)
    }
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
              <ElementalCompositionGroup
                handleSampleChanged={(s) => this.handleSampleChanged(s)}
                sample={sample}/>
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
          {this.moleculeCas()}
        </ListGroupItem>
      </Tab>
    )
  }

  sampleContainerTab(ind){
    let sample = this.state.sample || {}
    return(
      <Tab eventKey={ind} title={'Analyses'}
        key={'Container' + sample.id.toString()}>
        <ListGroupItem style={{paddingBottom: 20}}>
          <SampleDetailsContainers
            sample={sample} setState={(sample) => {this.setState(sample)}}
            handleSampleChanged={this.handleSampleChanged}
            />
        </ListGroupItem>
      </Tab>
    )
  }

  sampleLiteratureTab(ind) {
    const { sample } = this.state;
    if (!sample) { return null; }
    return (
      <Tab
        eventKey={ind}
        title="Literature"
        key={`Literature_${sample.id}`}
      >
        <ListGroupItem style={{ paddingBottom: 20 }} >
          <SampleDetailsLiteratures
            element={sample}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  sampleImportReadoutTab(ind) {
    let sample = this.state.sample || {}
    return (
      <Tab
        eventKey={ind}
        title={'Results'}
        key={'Results' + sample.id.toString()}
      >
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <FormGroup controlId="importedReadoutInput">
            <ControlLabel>Imported Readout</ControlLabel>
            <InputGroup>
              <FormControl
                type="text"
                value={sample.imported_readout || ''}
                disabled
                readOnly
              />
            </InputGroup>
          </FormGroup>
        </ListGroupItem>
      </Tab>
    );
  }

  moleculeComputedProps(ind) {
    const { sample } = this.state;
    if (!this.enableComputedProps) return <span />;

    return (
      <Tab
        eventKey={ind}
        title={'Computed Properties'}
        key={'computed_props' + sample.id.toString()}
      >
        <ListGroupItem style={{paddingBottom: 20}}>
          <ComputedPropsContainer sample={sample} />
        </ListGroupItem>
      </Tab>
    );
  }

  extraTab(ind, tabCount){
    let sample = this.state.sample || {}
    let num = ind - tabCount;
    let NoName =  XTabs["content"+num];
    let Title = XTabs["title"+num];
    return(
       <Tab eventKey={ind} key={ind} title={Title} >
         <ListGroupItem style={{paddingBottom: 20}}>
           <NoName  sample={sample}/>
         </ListGroupItem>
       </Tab>
      )
  }
  extraLabels(){
    let labels = [];
    for (let j=0;j < XLabels.count;j++){
      labels.push(XLabels["content"+j])
    }
    return labels;
  }

  sampleIsValid() {
    const {sample, loadingMolecule} = this.state;
    return (sample.isValid && !loadingMolecule) || sample.is_scoped == true;
  }

  saveBtn(sample, closeView = false) {
    let submitLabel = (sample && sample.isNew) ? "Create" : "Save";
    const isDisabled = !sample.can_update;
    if(closeView) submitLabel += ' and close';

    return (
      <Button bsStyle="warning"
              onClick={() => this.handleSubmit(closeView)}
              disabled={!this.sampleIsValid() || isDisabled}>
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
                onClick={() => DetailActions.close(sample)}>
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

  handleSelect(eventKey) {
    UIActions.selectTab({tabKey: eventKey, type: 'sample'});
  }

  render() {
    const sample = this.state.sample || {};
    const tabContents = [
      i => this.samplePropertiesTab(i),
      i => this.sampleContainerTab(i),
      i => this.sampleLiteratureTab(i),
      i => this.sampleImportReadoutTab(i),
      i => this.moleculeComputedProps(i)
    ];

    const tabCount = tabContents.length;
    for (let j = 0; j < XTabs.count; j++) {
      if (XTabs['on' + j](sample)) {
        tabContents.push(i => this.extraTab(i, tabCount));
      }
    }

    return (
      <Panel className="panel-detail"
             header={this.sampleHeader(sample)}
             bsStyle={sample.isPendingToSave ? 'info' : 'primary'}>
        {this.sampleInfo(sample)}
        <ListGroup>
        <Tabs activeKey={this.state.activeTab} onSelect={this.handleSelect} id="SampleDetailsXTab">
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
  toggleFullScreen: React.PropTypes.func,
}

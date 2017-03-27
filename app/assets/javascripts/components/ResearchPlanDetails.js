import React, {Component} from 'react';
import {FormGroup, ControlLabel, FormControl, Panel, ListGroup, ListGroupItem,
  ButtonToolbar, Button, Tooltip, OverlayTrigger, Glyphicon, Row, Col} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import StructureEditorModal from './structure_editor/StructureEditorModal';
import SVG from 'react-inlinesvg';

import ElementActions from './actions/ElementActions';
import ResearchPlansFetcher from './fetchers/ResearchPlansFetcher'
import QuillEditor from './QuillEditor'

export default class ResearchPlanDetails extends Component {
  constructor(props) {
    super(props);
    const {research_plan} = props;
    this.state = {
      research_plan,
      showStructureEditor: false,
      loadingMolecule: false
    }
  }

  svgOrLoading(research_plan) {
    let svgPath = "";
    if (this.state.loadingMolecule) {
      svgPath = "/images/loading-bubbles.svg";
    } else {
      svgPath = research_plan.svgPath;
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

  componentWillReceiveProps(nextProps) {
    const {research_plan} = nextProps;
    this.setState({ research_plan });
  }

  handleStructureEditorSave(sdf_file, svg_file) {
    let {research_plan} = this.state;

    research_plan.sdf_file = sdf_file;

    this.setState({loadingMolecule: true});
    ResearchPlansFetcher.updateSVGFile(svg_file).then((json) => {
      research_plan.svg_file = json.svg_path;

      this.setState({research_plan: research_plan, loadingMolecule: false});

      this.hideStructureEditor();
    });
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor()
  }

  structureEditorButton(isDisabled) {
    return (
      <Button onClick={this.showStructureEditor.bind(this)} disabled={isDisabled}>
        <Glyphicon glyph='pencil'/>
      </Button>
    )
  }

  structureEditorModal(research_plan) {
    const molfile = research_plan.sdf_file;
    return(
      <StructureEditorModal
        key={research_plan.id}
        showModal={this.state.showStructureEditor}
        onSave={this.handleStructureEditorSave.bind(this)}
        onCancel={this.handleStructureEditorCancel.bind(this)}
        molfile={molfile} />
    )
  }

  handleSubmit() {
    const {research_plan} = this.state;

    if(research_plan.isNew) {
      ElementActions.createResearchPlan(research_plan);
    } else {
      ElementActions.updateResearchPlan(research_plan);
    }
    if(research_plan.is_new) {
      const force = true;
      this.props.closeDetails(research_plan, force);
    }
  }

  handleInputChange(type, event) {
    let {research_plan} = this.state;
    const value = event.target.value;
    switch (type) {
      case 'name':
        research_plan.name = value;
        break;
      case 'description':
        research_plan.description = value;
        break;
    }
    this.setState({
      research_plan: research_plan
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

  researchPlanHeader(research_plan) {
    let saveBtnDisplay = research_plan.isEdited ? '' : 'none'

    return (
      <div>
        <i className="fa fa-file-text-o" />
        &nbsp; <span>{research_plan.name}</span> &nbsp;
        <ElementCollectionLabels element={research_plan} placement="right"/>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="closeresearch_plan">Close research_plan</Tooltip>}>
          <Button bsStyle="danger" bsSize="xsmall" className="button-right"
            onClick={() => this.props.closeDetails(research_plan)} >
            <i className="fa fa-times"></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveresearch_plan">Save research_plan</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
                  onClick={() => this.handleSubmit()}
                  style={{display: saveBtnDisplay}} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="fullSample">Fullresearch_plan</Tooltip>}>
        <Button bsStyle="info" bsSize="xsmall" className="button-right"
          onClick={() => this.props.toggleFullScreen()}>
          <i className="fa fa-expand"></i>
        </Button>
        </OverlayTrigger>
      </div>
    )
  }

  researchPlanInfo(research_plan) {
    const style = {height: '200px'};
    return (
      <Row style={style}>
        <Col md={2}>
          <h4>{research_plan.name}</h4>
        </Col>
        <Col md={10}>
          {this.svgOrLoading(research_plan)}
        </Col>
      </Row>
    )
  }

  render() {
    const {research_plan} = this.state;
    const {name, description} = research_plan;

    const submitLabel = research_plan.isNew ? "Create" : "Save";

    return (
      <Panel header={this.researchPlanHeader(research_plan)}
             bsStyle={research_plan.isPendingToSave ? 'info' : 'primary'}
             className="panel-detail">
        <ListGroup fill>
          <ListGroupItem>
            {this.researchPlanInfo(research_plan)}
            <Row>
              <Col md={4}>
                <FormGroup>
                  <ControlLabel>Name</ControlLabel>
                  <FormControl
                    type="text"
                    value={name || ''}
                    onChange={event => this.handleInputChange('name', event)}
                    disabled={research_plan.isMethodDisabled('name')}
                  />
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <FormGroup>
                  <ControlLabel>Description</ControlLabel>
                  <QuillEditor value={research_plan.description}
                    onChange={event => this.handleInputChange('description', {target: {value: event}})}
                    disabled={research_plan.isMethodDisabled('description')}
                  />
                </FormGroup>
              </Col>
            </Row>
          </ListGroupItem>
        </ListGroup>
        {this.structureEditorModal(research_plan)}
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => this.props.closeDetails(research_plan)}>Close</Button>
          <Button bsStyle="warning" onClick={() => this.handleSubmit()}>{submitLabel}</Button>
        </ButtonToolbar>
      </Panel>
    );
  }
}

ResearchPlanDetails.propTypes = {
  research_plan: React.PropTypes.object,
  closeDetails: React.PropTypes.func,
  toggleFullScreen: React.PropTypes.func,
}

import React, { Component } from 'react';
import {
  Col, Panel, ListGroupItem, ButtonToolbar, Button,
  Tabs, Tab, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import ElementActions from './actions/ElementActions';
import DetailActions from './actions/DetailActions';
import CollectionActions from './actions/CollectionActions';
import ReactionDetailsLiteratures from './ReactionDetailsLiteratures';
import ReactionDetailsContainers from './ReactionDetailsContainers';
import ReactionSampleDetailsContainers from './ReactionSampleDetailsContainers';
import ReactionDetailsScheme from './ReactionDetailsScheme';
import ReactionDetailsProperties from './ReactionDetailsProperties';
import Utils from './utils/Functions';
import PrintCodeButton from './common/PrintCodeButton';
import XTabs from './extra/ReactionDetailsXTabs';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import { setReactionByType } from './ReactionDetailsShare';
import { sampleShowOrNew } from './routesUtils';


export default class ReactionDetails extends Component {
  constructor(props) {
    super(props);

    const {reaction} = props;
    this.state = {
      reaction: reaction,
      activeTab: UIStore.getState().reaction.activeTab,
    };

    if(reaction.hasMaterials()) {
      this.updateReactionSvg();
    }
    this.onUIStoreChange = this.onUIStoreChange.bind(this);

  }

  onUIStoreChange(state) {
    if (state.reaction.activeTab != this.state.activeTab){
      this.setState({
        activeTab: state.reaction.activeTab
      })
    }
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange)
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange)
  }

  componentWillReceiveProps(nextProps) {
    const {reaction} = this.state;
    const nextReaction = nextProps.reaction;

    if (nextReaction.id != reaction.id ||
        nextReaction.updated_at != reaction.updated_at ||
        nextReaction.reaction_svg_file != reaction.reaction_svg_file ||
        nextReaction.changed || nextReaction.editedSample) {
      this.setState({
        reaction: nextReaction
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    let nextReaction = nextProps.reaction;
    let nextActiveTab = nextState.activeTab
    const {reaction, activeTab} = this.state;
    return (
      nextReaction.id != reaction.id ||
      nextReaction.updated_at != reaction.updated_at ||
      nextReaction.reaction_svg_file != reaction.reaction_svg_file ||
      !!nextReaction.changed || !!nextReaction.editedSample ||
      nextActiveTab != activeTab
    )
  }

  updateReactionSvg() {
    const {reaction} = this.state;
    const materialsSvgPaths = {
      starting_materials: reaction.starting_materials.map(material => material.svgPath),
      reactants: reaction.reactants.map(material => material.svgPath),
      products: reaction.products.map(material => [material.svgPath, material.equivalent])
    };

    const solvents = reaction.solvents.map(s => {
      let name = s.preferred_label
      if(name.length > 20) {
        return name.substring(0, 20).concat('...')
      }
      return name
    }).filter(s => s)

    const solventsArray = solvents.length !== 0 ? solvents : [reaction.solvent]
    let temperature = reaction.temperature_display
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature)) {
      temperature = temperature + " " + reaction.temperature.valueUnit
    }

    ElementActions.fetchReactionSvgByMaterialsSvgPaths(materialsSvgPaths, temperature, solventsArray);
  }

  handleSubmit() {
    const {reaction} = this.state;

    if(reaction && reaction.isNew) {
      ElementActions.createReaction(reaction);
    } else {
      ElementActions.updateReaction(reaction);
    }

    if(reaction.is_new) {
      const force = true;
      DetailActions.close(reaction, force);
    }
  }

  reactionIsValid() {
    const {reaction} = this.state;
    return reaction.hasMaterials() && reaction.SMGroupValid();
  }

  handleReactionChange(reaction, options={}) {
    reaction.changed = true;
    if(options.schemaChanged) {
      this.setState({ reaction }, () => this.updateReactionSvg());
    } else {
      this.setState({ reaction });
    }
  }

  handleInputChange(type, event) {
    let { value } = event.target;
    if (type === 'temperatureUnit' || type === 'temperatureData' ||
        type === 'description' || type === 'role' || type === 'observation') {
      value = event;
    }

    const { reaction } = this.state;

    const { newReaction, options } = setReactionByType(reaction, type, value);
    this.handleReactionChange(newReaction, options);
  }

  handleProductClick(product) {
    const uri = Aviator.getCurrentURI();
    const uriArray = uri.split(/\//);
    Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}/sample/${product.id}`, { silent: true });
    sampleShowOrNew({ params: { sampleID: product.id} });
  }

  handleProductChange(product) {
    let {reaction} = this.state

    reaction.updateMaterial(product)
    reaction.changed = true

    this.setState({ reaction })
  }

  productLink(product) {
    return (
      <span>
        Analysis:
        &nbsp;
        <span className="pseudo-link"
           onClick={() => this.handleProductClick(product)}
           style={{cursor: 'pointer'}}
           title="Open sample window">
           {product.title()}
        </span>
      </span>
    )
  }

  productData(reaction) {
    const {products} = this.state.reaction;

    let tabs = products.map((product, key) =>
      <Tab key={product.short_label} eventKey={key}
           title={this.productLink(product)}>
        <ReactionSampleDetailsContainers sample={product}
          setState={(product) => this.handleProductChange(product)}
          handleSampleChanged={(product) => this.handleProductChange(product)}
        />
      </Tab>
    );

    return(
      <Tabs defaultActiveKey={4.1} id="data-detail-tab"
            style={{marginTop: "10px"}}>
        <Tab eventKey={4.1} title={reaction.short_label}>
          <ListGroupItem style={{paddingBottom: 20}}>
            <ReactionDetailsContainers reaction={reaction} parent={this} />
          </ListGroupItem>
        </Tab>
        {tabs}
      </Tabs>
    )
  }

  extraTab(ind){
    let reaction = this.state.reaction || {}
    let num = ind  ;
    let NoName =  XTabs["content"+num];
    let TabName = XTabs["title"+num];
    return(
       <Tab eventKey={ind+4}  title={TabName} key={"sampleDetailsTab"+ind+3} >
         <ListGroupItem style={{paddingBottom: 20}}>
           <NoName  reaction={reaction}/>
         </ListGroupItem>
       </Tab>
      )
  }

  reactionSVG(reaction) {
    if(!reaction.svgPath) {
      return false;
    } else {
      return (
        <Col md={12}>
          <SvgFileZoomPan svgPath={reaction.svgPath}
                          duration={300}
                          resize={true} />
        </Col>
      )
    }
  }

  reactionHeader(reaction) {
    let hasChanged = reaction.changed ? '' : 'none'
    return (
      <h4>
        <i className="icon-reaction"/>&nbsp;{reaction.title()}
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="closeReaction">Close Reaction</Tooltip>}>
          <Button bsStyle="danger" bsSize="xsmall" className="button-right"
              onClick={() => DetailActions.close(reaction)}>
            <i className="fa fa-times"></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveReaction">Save Reaction</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
              onClick={() => this.handleSubmit()}
              disabled={!this.reactionIsValid()}
              style={{display: hasChanged}} >
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
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="generateReport">Generate Report</Tooltip>}>
          <Button bsStyle="success" bsSize="xsmall" className="button-right"
            disabled={reaction.changed || reaction.isNew}
            title={(reaction.changed || reaction.isNew) ?
                 "Report can be generated after reaction is saved."
                 : "Generate report for this reaction"}
            onClick={() => Utils.downloadFile({
              contents: "api/v1/reports/docx?id=" + reaction.id,
              name: reaction.name
            })} >
            <i className="fa fa-cogs"></i>
          </Button>
        </OverlayTrigger>
        <div style={{display: "inline-block", marginLeft: "10px"}}>
          <ElementCollectionLabels element={reaction} key={reaction.id} placement="right"/>
          <ElementAnalysesLabels element={reaction} key={reaction.id+"_analyses"}/>
        </div>
        <PrintCodeButton element={reaction}/>
      </h4>
    )
  }

  handleSelect(key) {
    UIActions.selectTab({tabKey: key, type: 'reaction'});
    this.setState({
      activeTab: key
    })
  }

  render() {
    const {reaction} = this.state;

    const submitLabel = (reaction && reaction.isNew) ? "Create" : "Save";
    let extraTabs =[];
    for (let j=0;j < XTabs.count;j++){
      if (XTabs['on'+j](reaction)){extraTabs.push((i)=>this.extraTab(i))}
    }

    return (
      <Panel className='panel-detail' header={this.reactionHeader(reaction)}
             bsStyle={reaction.isPendingToSave ? 'info' : 'primary'}>
        {this.reactionSVG(reaction)}
        <Tabs activeKey={this.state.activeTab} onSelect={this.handleSelect.bind(this)}
           id="reaction-detail-tab">
          <Tab eventKey={0} title={'Scheme'}>
            <ReactionDetailsScheme
              reaction={reaction}
              onReactionChange={(reaction, options) => this.handleReactionChange(reaction, options)}
              onInputChange={(type, event) => this.handleInputChange(type, event)}
              />
          </Tab>
          <Tab eventKey={1} title={'Properties'}>
            <ReactionDetailsProperties
              reaction={reaction}
              onReactionChange={reaction => this.handleReactionChange(reaction)}
              onInputChange={(type, event) => this.handleInputChange(type, event)}
              />
          </Tab>
          <Tab eventKey={2} title={'References'}>
            <ReactionDetailsLiteratures
              reaction={reaction}
              onReactionChange={reaction => this.handleReactionChange(reaction)}
              />
          </Tab>
          <Tab eventKey={3} title={'Analyses'}>
              {this.productData(reaction)}
          </Tab>
          {extraTabs.map((e,i)=>e(i))}
        </Tabs>
        <hr/>
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => DetailActions.close(reaction)}>
            Close
          </Button>
          <Button bsStyle="warning" onClick={() => this.handleSubmit()} disabled={!this.reactionIsValid()}>
            {submitLabel}
          </Button>
          <Button bsStyle="default" onClick={() => CollectionActions.downloadReportReaction(reaction.id)}>
            Export samples
          </Button>
        </ButtonToolbar>
      </Panel>
    );
  }
}

ReactionDetails.propTypes = {
  reaction: React.PropTypes.object,
  toggleFullScreen: React.PropTypes.func,
}

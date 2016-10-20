import React, {Component} from 'react'
import {Col, Panel, ListGroupItem, ButtonToolbar, Button, Tabs, Tab,
  OverlayTrigger, Tooltip} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import ElementActions from './actions/ElementActions';
import CollectionActions from './actions/CollectionActions';
import ReactionDetailsLiteratures from './ReactionDetailsLiteratures';
import ReactionDetailsAnalyses from './ReactionDetailsAnalyses';
import ReactionDetailsScheme from './ReactionDetailsScheme';
import ReactionDetailsProperties from './ReactionDetailsProperties';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import SVG from 'react-inlinesvg';
import Utils from './utils/Functions';

import XTab from "./extra/ReactionDetailsXTab";
import XTabName from "./extra/ReactionDetailsXTabName";

import StickyDiv from 'react-stickydiv'

import {setReactionByType} from './ReactionDetailsShare'

import SvgFileZoomPan from 'react-svg-file-zoom-pan';

export default class ReactionDetails extends Component {
  constructor(props) {
    super(props);
    const {reaction} = props;
    this.state = {
      reaction,
      offsetTop: 70,
      fullScreen: false
    };
    this.handleResize = this.handleResize.bind(this);
    if(reaction.hasMaterials()) {
      this.updateReactionSvg();
    }
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount(){
    window.removeEventListener('resize', this.handleResize);
  }

  componentWillReceiveProps(nextProps) {
    const {reaction} = this.state;
    const nextReaction = nextProps.reaction;
    if (nextReaction.id != reaction.id ||
        nextReaction.updated_at != reaction.updated_at ||
        nextReaction.temperature != reaction.temperature) {
      this.setState({
        reaction: nextReaction
      });
    }
  }

  handleResize(e = null) {
    let windowHeight = window.innerHeight || 1;
    if (this.state.fullScreen || windowHeight < 500) {
      this.setState({offsetTop:0});
    } else { this.setState( {offsetTop:70}) }
  }

  closeDetails() {
    UIActions.deselectAllElements();
    ElementActions.deselectCurrentReaction();
    const {currentCollection,isSync} = UIStore.getState();
    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}`
      : `/collection/${currentCollection.id}`
    );
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
    if (/^\-?\d*\.{0,1}\d{0,2}$/.test(temperature)) {
      temperature = temperature + " " + reaction.temperature.valueUnit
    }

    ElementActions.fetchReactionSvgByMaterialsSvgPaths(materialsSvgPaths, temperature, solventsArray);
  }

  submitFunction() {
    const {reaction} = this.state;

    // set corrected values before we save the reaction
    reaction.products.map(function(product) {
      if(product.adjusted_loading && product.error_mass) {
        product.loading = product.adjusted_loading;
        product.equivalent = product.adjusted_equivalent;
        product.setAmountAndNormalizeToGram(
          {
            value: product.adjusted_amount_g,
            unit: 'g'
        });

      }
    })

    if(reaction && reaction.isNew) {
      ElementActions.createReaction(reaction);
    } else {
      ElementActions.updateReaction(reaction);
    }
  }


  toggleFullScreen() {
    let {fullScreen} = this.state

    this.setState({
      fullScreen: !fullScreen
    })
  }

  reactionIsValid() {
    const {reaction} = this.state;
    return reaction.hasMaterials() && reaction.SMGroupValid();
  }

  handleReactionChange(reaction, options={}) {
    reaction.changed = true;
    if(options.schemaChanged) {
      this.setState({ reaction }, () => this.updateReactionSvg());
    } else{
      this.setState({ reaction });
    }
  }

  handleInputChange(type, event) {
    let value
    if (type == "temperatureUnit" || type == "temperatureData")  {
      value = event;
    } else {
      value = event.target.value;
    }

    const {reaction} = this.state;

    const {newReaction, options} = setReactionByType(reaction, type, value)
    this.handleReactionChange(newReaction, options);
  }

  handleProductClick(product) {
    let currentURI = Aviator.getCurrentURI();
    Aviator.navigate(`${currentURI}/sample/${product.id}`);
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

  productAnalyses() {
    const {products} = this.state.reaction;
    let tabs = products.map((product, key) =>
           <Tab key={product.short_label}
                eventKey={key}
                title={this.productLink(product)}>

             <ReactionDetailsAnalyses
                sample={product}
                />
           </Tab>
     );
    return(
        <Tabs defaultActiveKey={0} id="product-analyses-tab">
          {tabs}
        </Tabs>
    )
  }

  extraTab(ind){
    let reaction = this.state.reaction || {}
    let num = ind  ;
    let NoName =  XTab["Tab"+num];
    let TabName = XTabName["TabName"+num];
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
              onClick={this.closeDetails.bind(this)}>
            <i className="fa fa-times"></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveReaction">Save Reaction</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
              onClick={() => this.submitFunction()}
              disabled={!this.reactionIsValid()}
              style={{display: hasChanged}} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
        <Button bsStyle="info" bsSize="xsmall" className="button-right"
          onClick={() => this.toggleFullScreen()}>
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
      </h4>
    )
  }

  render() {
    let {reaction, fullScreen} = this.state;
    let fScrnClass = fullScreen ? "full-screen" : ""
    reaction.temporary_sample_counter = reaction.temporary_sample_counter || 0;

    const submitLabel = (reaction && reaction.isNew) ? "Create" : "Save";
    let extraTabs =[];
    for (let j=0;j < XTab.TabCount;j++){
      extraTabs.push((i)=>this.extraTab(i))
    }

    return (
      <div className={fScrnClass}>
      <StickyDiv zIndex={2} offsetTop={this.state.offsetTop}>
        <Panel className='panel-detail' header={this.reactionHeader(reaction)}
               bsStyle={reaction.changed ? 'info' : 'primary'}>
          {this.reactionSVG(reaction)}
          <Tabs defaultActiveKey={0} id="reaction-detail-tab">
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
              {this.productAnalyses()}
            </Tab>
            {extraTabs.map((e,i)=>e(i))}
          </Tabs>
          <hr/>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => this.closeDetails()}>
              Close
            </Button>
            <Button bsStyle="warning" onClick={() => this.submitFunction()} disabled={!this.reactionIsValid()}>
              {submitLabel}
            </Button>
            <Button bsStyle="default" onClick={() => CollectionActions.downloadReportReaction(reaction.id)}>
              Export samples
            </Button>
          </ButtonToolbar>
        </Panel>
      </StickyDiv>
      </div>
    );
  }
}

ReactionDetails.propTypes = {
  reaction: React.PropTypes.object
}

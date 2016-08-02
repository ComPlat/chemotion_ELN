import React, {Component} from 'react'
import {Col, Row, Panel, ListGroup, ListGroupItem, ButtonToolbar, Button, Tabs, Tab} from 'react-bootstrap';
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

export default class ReactionDetails extends Component {
  constructor(props) {
    super(props);
    const {reaction} = props;
    this.state = {
      reaction,
      reactionPanelFixed: false
    };

    if(reaction.hasMaterials()) {
      this.updateReactionSvg();
    }
  }

  componentDidMount() {
    const {reaction} = this.state;
  }

  componentWillReceiveProps(nextProps) {
    const {reaction} = this.state;
    const nextReaction = nextProps.reaction;
    if (nextReaction.id != reaction.id || nextReaction.updated_at != reaction.updated_at) {
      this.setState({
        reaction: nextReaction
      });
    }
  }

  closeDetails() {
    let uiState = UIStore.getState();
    UIActions.deselectAllElements();
    ElementActions.deselectCurrentReaction();
    Aviator.navigate(`/collection/${uiState.currentCollection.id}`);
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
    const temperature = reaction.temperature
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
    const {value} = event.target;
    const {reaction} = this.state;

    const {newReaction, options} = setReactionByType(reaction, type, value)
    this.handleReactionChange(newReaction, options);
  }

  handleProductClick(product) {
    const uiState = UIStore.getState();
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

  reactionSVG(reaction, svgContainerStyle) {
    if(!reaction.svgPath) {
      return false;
    } else {
      return (
        <Col md={9}>
          <div style={svgContainerStyle}>
            <SVG key={reaction.svgPath} src={reaction.svgPath} className='reaction-details'/>
          </div>
        </Col>
      )
    }
  }

  render() {
    let {reaction} = this.state;
    reaction.temporary_sample_counter = reaction.temporary_sample_counter || 0;
    const svgContainerStyle = {
      textAlign: 'center'
    };
    const submitLabel = (reaction && reaction.isNew) ? "Create" : "Save";
    const style = {height: '220px'};
    let extraTabs =[];
    for (let j=0;j < XTab.TabCount;j++){
      extraTabs.push((i)=>this.extraTab(i))
    }
    return (
      <StickyDiv zIndex={2}>
        <Panel className="panel-fixed"
               header="Reaction Details"
               bsStyle={reaction.isEdited ? 'info' : 'primary'}>
          <Button bsStyle="danger"
                  bsSize="xsmall"
                  className="button-right"
                  onClick={this.closeDetails.bind(this)}>
            <i className="fa fa-times"></i>
          </Button>
          <Row>
            <Col md={3} style={style}>
              <h3>{reaction.name}</h3>
              <ElementCollectionLabels element={reaction} key={reaction.id}/><br/>
              <ElementAnalysesLabels element={reaction} key={reaction.id+"_analyses"}/><br/>
              <Button
                style={{cursor: 'pointer'}}
                disabled={reaction.changed || reaction.isNew}
                title={(reaction.changed || reaction.isNew) ?
                   "Report can be generated after reaction is saved."
                   : "Generate report for this reaction"}
                onClick={() => Utils.downloadFile({
                  contents: "api/v1/reports/docx?id=" + reaction.id,
                  name: reaction.name
                })}
              >
                Generate Report
              </Button>
            </Col>
            {this.reactionSVG(reaction, svgContainerStyle)}
          </Row>
          <hr/>
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
            <Tab eventKey={2} title={'Literatures'}>
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
    );
  }
}

ReactionDetails.propTypes = {
  reaction: React.PropTypes.object
}

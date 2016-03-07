import React, {Component} from 'react'
import {Col, Row, Panel, ListGroup, ListGroupItem, ButtonToolbar, Button, Tabs, Tab} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import ElementStore from './stores/ElementStore';
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
import extra from './extra/ReactionDetailsExtra';

export default class ReactionDetails extends Component {
  constructor(props) {
    super(props);
    const {reaction} = props;
    this.state = {
      reaction
    };
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
    const uiState = UIStore.getState();
    UIActions.deselectAllElements();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  updateReactionSvg() {
    const {reaction} = this.state;
    const materialsSvgPaths = {
      starting_materials: reaction.starting_materials.map(material => material.svgPath),
      reactants: reaction.reactants.map(material => material.svgPath),
      products: reaction.products.map(material => material.svgPath)
    };
    const label = [reaction.solvent, reaction.temperature]
                  .filter(item => item) // omit empty string
                  .join(', ')
    ElementActions.fetchReactionSvgByMaterialsSvgPaths(materialsSvgPaths, label);
  }

  submitFunction() {
    const {reaction} = this.state;
    if(reaction && reaction.isNew) {
      ElementActions.createReaction(reaction);
    } else {
      ElementActions.updateReaction(reaction);
    }
  }

  reactionIsValid() {
    const {reaction} = this.state;
    return reaction.hasMaterials();
  }

  handleReactionChange(reaction, options={}) {
    if(options.schemaChanged) {
      this.setState({ reaction }, () => this.updateReactionSvg());
    } else{
      this.setState({ reaction });
    }
  }



  productAnalyses() {
    const {products} = this.state.reaction;
    let tabs = products.map((product, key) =>
           <Tab key={product.short_label} eventKey={key} title={"Analysis: " + product.short_label}>
             <ReactionDetailsAnalyses
                sample={product}
                />
           </Tab>
     );
    return(
        <Tabs defaultActiveKey={0}>
          {tabs}
        </Tabs>
    )
  }

  extraTab(ind){
    let reaction = this.state.reaction || {}
    let num = ind  ;
    let NoName =  extra["Tab"+num];
    let TabName = extra["TabName"+num];
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
    const {reaction} = this.state;
    const svgContainerStyle = {
      textAlign: 'center'
    };
    const submitLabel = (reaction && reaction.isNew) ? "Create" : "Save";
    const style = {height: '220px'};
    let extraTabs =[];
    for (let j=0;j < extra.TabCount;j++){
      extraTabs.push((i)=>this.extraTab(i))
    }
    return (
        <Panel header="Reaction Details" bsStyle={reaction.isEdited ? 'info' : 'primary'}>
          <Button bsStyle="danger" bsSize="xsmall" className="button-right" onClick={this.closeDetails.bind(this)}>
            <i className="fa fa-times"></i>
          </Button>
          <Row>
            <Col md={3} style={style}>
              <h3>{reaction.name}</h3>
              <ElementCollectionLabels element={reaction} key={reaction.id}/><br/>
              <ElementAnalysesLabels element={reaction} key={reaction.id+"_analyses"}/><br/>
              <Button
                style={{cursor: 'pointer'}}
                onClick={() => Utils.downloadFile({
                  contents: "api/v1/reports/rtf?id=" + reaction.id,
                  name: reaction.name
                })}
              >
                Generate Report
              </Button>
            </Col>
            {this.reactionSVG(reaction, svgContainerStyle)}
          </Row>
          <hr/>
          <Tabs defaultActiveKey={0}>
            <Tab eventKey={0} title={'Scheme'}>
              <ReactionDetailsScheme
                reaction={reaction}
                onReactionChange={(reaction, options) => this.handleReactionChange(reaction, options)}
                />
            </Tab>
            <Tab eventKey={1} title={'Properties'}>
              <ReactionDetailsProperties
                reaction={reaction}
                onReactionChange={(reaction, options) => this.handleReactionChange(reaction, options)}
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
    );
  }
}

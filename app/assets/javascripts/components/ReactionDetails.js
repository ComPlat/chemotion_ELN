import React, {Component} from 'react'
import {Col, Row, Panel, ListGroup, ListGroupItem, ButtonToolbar, Button, TabbedArea, TabPane} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
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
    const materialsInchikeys = {
      starting_materials: reaction.starting_materials.map(material => material.molecule.inchikey),
      reactants: reaction.reactants.map(material => material.molecule.inchikey),
      products: reaction.products.map(material => material.molecule.inchikey)
    };
    const label = (reaction.solvents && reaction.temperature) ? reaction.solvents + ", " + reaction.temperature : '';
    ElementActions.fetchReactionSvgByMaterialsInchikeys(materialsInchikeys, label);
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
    if(products.length > 0) {
      return products.map((product, key) => {
        if(product.analyses.length > 0) {
          return (
            <TabPane key={key} eventKey={3 + key} tab={"Analysis: " + product.name}>
              <ReactionDetailsAnalyses
                sample={product}
                />
            </TabPane>
          )
        }
      });
    } else {
      return <div></div>
    }
  }

  render() {
    const {reaction} = this.state;
    const svgContainerStyle = {
      textAlign: 'center'
    };
    const submitLabel = (reaction && reaction.isNew) ? "Create" : "Save";
    return (
        <Panel header="Reaction Details" bsStyle={reaction.isEdited ? 'info' : 'primary'}>
          <Row>
            <Col md={3}>
              <h3>{reaction.name}</h3>
              <ElementCollectionLabels element={reaction} key={reaction.id}/><br/>
              <Button href={"api/v1/reports/rtf?id=" + reaction.id}>Generate Report</Button>
            </Col>
            <Col md={9}>
              <div style={svgContainerStyle}>
                <SVG key={reaction.svgPath} src={reaction.svgPath} className='reaction-details'/>
              </div>
            </Col>
          </Row>
          <hr/>
          <TabbedArea defaultActiveKey={0}>
            <TabPane eventKey={0} tab={'Scheme'}>
              <ReactionDetailsScheme
                reaction={reaction}
                onReactionChange={(reaction, options) => this.handleReactionChange(reaction, options)}
                />
            </TabPane>
            <TabPane eventKey={1} tab={'Properties'}>
              <ReactionDetailsProperties
                reaction={reaction}
                onReactionChange={reaction => this.handleReactionChange(reaction)}
                />
            </TabPane>
            <TabPane eventKey={2} tab={'Literatures'}>
              <ReactionDetailsLiteratures
                reaction={reaction}
                onReactionChange={reaction => this.handleReactionChange(reaction)}
                />
            </TabPane>
            {this.productAnalyses()}
          </TabbedArea>
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

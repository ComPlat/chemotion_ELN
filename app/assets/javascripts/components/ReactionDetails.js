import React, {Component} from 'react'
import {Col, Row, Panel, ListGroup, ListGroupItem, ButtonToolbar, Button, TabbedArea, TabPane} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementStore from './stores/ElementStore';
import ElementActions from './actions/ElementActions';
import ReactionDetailsLiteratures from './ReactionDetailsLiteratures';
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
    if(reaction.id != '_new_') {
      ElementActions.fetchReactionSvgByReactionId(reaction.id);
    }
  }

  componentWillReceiveProps(nextProps) {
    const {reaction} = this.state;
    const nextReaction = nextProps.reaction;
    if (nextReaction.id != reaction.id || nextReaction.updated_at != reaction.updated_at) {
      if(!nextReaction.isNew){
        ElementActions.fetchReactionSvgByReactionId(nextReaction.id);
      }
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
    ElementActions.fetchReactionSvgByMaterialsInchikeys(materialsInchikeys);
  }

  submitFunction() {
    const {reaction} = this.state;
    if(reaction && reaction.isNew) {
      reaction.collection_id = UIStore.getState().currentCollectionId;
      ElementActions.createReaction(reaction);
    } else {
      ElementActions.updateReaction(this.state.reaction);
    }
  }

  reactionIsValid() {
    return true
  }

  handleChangeProperties(change) {
    let {type, value} = change;
    let {reaction} = this.state;
    switch (type) {
      case 'name':
        reaction.name = value;
        break;
      case 'observation':
        reaction.observation = value;
        break;
      case 'status':
        reaction.status = value;
        break;
      case 'description':
        reaction.description = value;
        break;
      case 'purification':
        reaction.purification = value;
        break;
      case 'solvents':
        reaction.solvents = value;
        break;
      case 'rfValue':
        reaction.rf_value = value;
        break;
      case 'timestampStart':
        reaction.timestamp_start = value;
        break;
      case 'timestampStop':
        reaction.timestamp_stop = value;
        break;
      case 'tlcDescription':
        reaction.tlc_description = value;
        break;
      case 'temperature':
        reaction.temperature = value;
        break;
      case 'dangerousProducts':
        reaction.dangerous_products = value;
        break;
    }
    this.setState({reaction})
  }

  handleChangeReaction(reaction) {
    this.setState({ reaction }, () => this.updateReactionSvg());
  }

  render() {
    const {reaction} = this.state;
    const svgPath = (reaction.reactionSvg) ? "/images/reactions/" + reaction.reactionSvg : "";
    const svgContainer = {
      position: 'relative',
      padding: 0,
      paddingBottom: '30%'
    };
    const submitLabel = (reaction && reaction.isNew) ? "Create" : "Save";
    return (
        <Panel header="Reaction Details" bsStyle='primary'>
          <Row>
            <Col md={3}>
              <h3>{reaction.name}</h3>
              <ElementCollectionLabels element={reaction} key={reaction.id}/><br/>
              <Button href={"api/v1/reports/rtf?id=" + reaction.id}>Generate Report</Button>
            </Col>
            <Col md={9}>
              <div style={svgContainer}>
                <SVG key={reaction.reactionSvg} src={svgPath} className="molecule-small"/>
              </div>
            </Col>
          </Row>
          <hr/>
          <TabbedArea defaultActiveKey={1}>
            <TabPane eventKey={0} tab={'Properties'}>
              <ReactionDetailsProperties
                reaction={reaction}
                changeProperties={properties => this.handleChangeProperties(properties)}
                />
            </TabPane>
            <TabPane eventKey={1} tab={'Scheme'}>
              <ReactionDetailsScheme
                reaction={reaction}
                changeReaction={reaction => this.handleChangeReaction(reaction)}
                />
            </TabPane>
            <TabPane eventKey={2} tab={'Literatures'}>
              <ReactionDetailsLiteratures
                reaction_id={reaction.id}
                literatures={reaction.literatures}
                />
            </TabPane>
          </TabbedArea>
          <hr/>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => this.closeDetails()}>
              Close
            </Button>
            <Button bsStyle="warning" onClick={() => this.submitFunction()} disabled={!this.reactionIsValid()}>
              {submitLabel}
            </Button>
          </ButtonToolbar>
        </Panel>
    );
  }
}

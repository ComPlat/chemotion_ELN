import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  PanelGroup,
  Button,
  Panel,
  ListGroup,
  ListGroupItem,
  Row,
  Col,
  Glyphicon
} from 'react-bootstrap';
import Immutable from 'immutable';
import Cite from 'citation-js';

import {
  Citation,
  doiValid,
  sanitizeDoi,
  AddButton,
  DoiInput,
  UrlInput,
  TitleInput
} from './LiteratureCommon';
import Literature from './models/Literature';
import LiteratureMap from './models/LiteratureMap';
import LiteraturesFetcher from './fetchers/LiteraturesFetcher';
import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import DetailActions from './actions/DetailActions';
import PanelHeader from './common/PanelHeader';

const CloseBtn = ({ onClose }) => (
  <Button
    key="closeBtn"
    onClick={onClose}
    bsStyle="danger"
    bsSize="xsmall"
    className="button-right"
  >
    <i className="fa fa-times" />
  </Button>
);

CloseBtn.propTypes = {
  onClose: PropTypes.func.isRequired,
};

const ElementLink = ({ literature }) => {
  const {
    external_label,
    short_label,
    name,
    element_type
  } = literature;

  return (
    <Button title={`${external_label ? external_label.concat(' - ') : null}${name}`} >
      <i className={element_type ? 'icon-'.concat(element_type.toLowerCase()) : ''} />
      &nbsp; {short_label}
    </Button>
  );
};
ElementLink.propTypes = {
  literature: PropTypes.instanceOf(Literature).isRequired,
};

export default class LiteratureDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...this.props.literatureMap,
      literature: Literature.buildEmpty(),
    };
    this.onClose = this.onClose.bind(this);
    this.handleUIStoreChange = this.handleUIStoreChange.bind(this);

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLiteratureAdd = this.handleLiteratureAdd.bind(this);
    this.fetchDOIMetadata = this.fetchDOIMetadata.bind(this);
  }

  componentDidMount() {
    const { currentCollection, sample, reaction } = UIStore.getState();
    LiteraturesFetcher.fetchReferencesByCollection(currentCollection).then((literatures) => {
      this.setState(prevState => ({
        ...prevState,
        ...literatures,
        currentCollection,
        sample: { ...sample },
        reaction: { ...reaction },
      }));
    });
    UIStore.listen(this.handleUIStoreChange);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.handleUIStoreChange);
  }
  // shouldComponentUpdate(nextProps, nextState){
  //
  // }

  onClose() {
    DetailActions.close(this.props.literatureMap, true);
  }

  handleUIStoreChange(state) {
    const cCol = this.state.currentCollection;
    const { currentCollection } = state;

    if (cCol && currentCollection &&
        (cCol.id !== currentCollection.id || cCol.is_sync_to_me !== currentCollection.is_sync_to_me)
    ) {
      LiteraturesFetcher.fetchReferencesByCollection(currentCollection).then((literatures) => {
        this.setState(prevState => ({
          ...prevState,
          ...literatures,
          currentCollection,
          sample: {},
          reaction: {},
        }));
      });
      return null;
    }
    const { sample, reaction } = state;
    const prevSample = this.state.sample;
    const prevReaction = this.state.reaction;

    if (prevSample.checkedIds !== sample.checkedIds
      || prevSample.unCheckedIds !== sample.unCheckedIds
      || prevSample.checkedAll !== sample.checkedAll
      || prevReaction.checkedIds !== reaction.checkedIds
      || prevReaction.unCheckedIds !== reaction.unCheckedIds
      || prevReaction.checkedAll !== reaction.checkedAll
    ) {
      const params = {
        sample,
        reaction,
        id: currentCollection.id,
        is_sync_to_me: currentCollection.is_sync_to_me

      };
      LiteraturesFetcher.postReferencesByUIState(params).then((selectedRefs) => {
        this.setState(prevState => ({
          ...prevState,
          selectedRefs,
          currentCollection,
          sample: { ...sample },
          reaction: { ...reaction },
        }));
      });
    }
    return null;
  }

  literatureRows(literatures) {
    return literatures.map(literature => (
      <tr key={`${literature.id}-${literature.element_type}-${literature.element_id}`}>
        <td><ElementLink literature={literature} /></td>
        <td className="padding-right">
          <Citation literature={literature} />
        </td>
        <td>
          {/* {this.removeButton(literature)} */}
        </td>
      </tr>
    ));
  }

  handleInputChange(type, event) {
    const { literature } = this.state;
    const { value } = event.target;
    switch (type) {
      case 'url':
        literature.url = value;
        break;
      case 'title':
        literature.title = value;
        break;
      case 'doi':
        literature.doi = value;
        break;
      default:
        break;
    }
    this.setState(prevState => ({ ...prevState, literature }));
  }

  handleLiteratureAdd(literature) {
    const { currentCollection, sample, reaction } = UIStore.getState();
    const params = {
      sample,
      reaction,
      id: currentCollection.id,
      is_sync_to_me: currentCollection.is_sync_to_me,
      ref: literature
    };
    LiteraturesFetcher.postReferencesByUIState(params).then((selectedRefs) => {
      this.setState(prevState => ({
        ...prevState,
        selectedRefs,
        currentCollection,
        sample: { ...sample },
        reaction: { ...reaction },
      }));
    });
  }

  fetchDOIMetadata() {
    const { doi } = this.state.literature;
    Cite.inputAsync(sanitizeDoi(doi)).then((json) => {
      if (json[0]) {
        const citation = new Cite(json[0]);
        const { title, year } = json[0];
        this.setState(prevState => ({
          ...prevState,
          literature: {
            ...prevState.literature,
            title,
            year,
            refs: {
              citation,
              bibtex: citation.format('bibtex')
            }
          }
        }));
      }
    });
  }

  render() {
    const {
      collectionRefs,
      sampleRefs,
      reactionRefs,
      // researchPlanRefs
      selectedRefs,
      currentCollection,
      literature
    } = this.state;

    const label = currentCollection ? currentCollection.label : null
    return (
      <Panel
        header={
          <PanelHeader
            title={`Literature Management for collection '${label}'`}
            btns={[<CloseBtn key="close tab" onClose={this.onClose} />]}
          />
        }
        bsStyle="info"
        className="format-analysis-panel"
      >
        <PanelGroup accordion defaultActiveKey="1">
          <Panel
            eventKey="1"
            collapsible
            header="Collection References"
          >
            <Table>
              <thead><tr><th width="10%" /><th width="80%" /><th width="10%" /></tr></thead>
              <tbody>{this.literatureRows(collectionRefs)}</tbody>
            </Table>
          </Panel>
          <Panel
            eventKey="2"
            collapsible
            header="References for Samples"
          >
            <Table>
              <thead><tr><th width="10%" /><th width="80%" /><th width="10%" /></tr></thead>
              <tbody>{this.literatureRows(sampleRefs)}</tbody>
            </Table>
          </Panel>
          <Panel
            eventKey="3"
            collapsible
            header="References for Reactions"
          >
            <Table>
              <thead><tr><th width="10%" /><th width="80%" /><th width="10%" /></tr></thead>
              <tbody>{this.literatureRows(reactionRefs)}</tbody>
            </Table>
          </Panel>
          <Panel
            eventKey="4"
            collapsible
            header="References for selected Elements"
          >
            <ListGroup>
              <ListGroupItem>
                <Row>
                  <Col md={11} style={{ paddingRight: 0 }}>
                    <DoiInput handleInputChange={this.handleInputChange} literature={literature} />
                  </Col>
                  <Col md={1} style={{ paddingRight: 0 }}>
                    <Button
                      onClick={this.fetchDOIMetadata}
                      title="fetch metadata for this doi"
                      disabled={!doiValid(literature.doi)}
                    >
                      <Glyphicon glyph="retweet" />
                    </Button>
                  </Col>
                  <Col md={12} style={{ paddingRight: 0 }}>
                    <Citation literature={literature} />
                  </Col>
                  <Col md={7} style={{ paddingRight: 0 }}>
                    <TitleInput
                      handleInputChange={this.handleInputChange}
                      literature={literature}
                    />
                  </Col>
                  <Col md={4} style={{ paddingRight: 0 }}>
                    <UrlInput handleInputChange={this.handleInputChange} literature={literature} />
                  </Col>
                  <Col md={1}>
                    <AddButton onLiteratureAdd={this.handleLiteratureAdd} literature={literature} />
                  </Col>
                </Row>
              </ListGroupItem>
            </ListGroup>
            <Table>
              <thead><tr><th width="10%" /><th width="80%" /><th width="10%" /></tr></thead>
              <tbody>{this.literatureRows(selectedRefs)}</tbody>
            </Table>
          </Panel>
        </PanelGroup>

      </Panel>


    );
  }
}

LiteratureDetails.propTypes = {
  literatureMap: PropTypes.instanceOf(LiteratureMap).isRequired
};

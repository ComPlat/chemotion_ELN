import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  Table,
  Button,
  ListGroup,
  ListGroupItem,
  Row,
  Col,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import Immutable from 'immutable';
import { uniqBy } from 'lodash';
import {
  Citation,
  CitationUserRow,
  doiValid,
  sanitizeDoi,
  AddButton,
  LiteratureInput,
  sortByElement,
  LiteralType,
  literatureContent
} from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import Literature from 'src/models/Literature';
import LiteratureMap from 'src/models/LiteratureMap';
import LiteraturesFetcher from 'src/fetchers/LiteraturesFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { copyToClipboard } from 'src/utilities/clipboard';

const Cite = require('citation-js');

const ElementLink = ({ literature }) => {
  const {
    external_label,
    short_label,
    name,
    element_type,
    element_id,
  } = literature;
  const type = element_type && element_type.toLowerCase();
  return (
    <Button
      title={`${external_label ? external_label.concat(' - ') : ''}${name}`}
      onClick={() => {
        const { uri } = Aviator.getCurrentRequest();
        const uriArray = uri.split(/\//);
        if (type && element_id) {
          Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}/${type}/${element_id}`);
        }
      }}
    >
      <i className={`me-2 ${element_type ? `icon-${type}` : ''}`} />
      {short_label}
    </Button>
  );
};
ElementLink.propTypes = {
  literature: PropTypes.instanceOf(Literature).isRequired,
};

const ElementTypeLink = ({ literature, type }) => {
  const {
    count
  } = literature;
  return (
    <Button title={`cited in ${count} ${type}${count && count > 1 ? 's' : ''}`}>
      <i className={`icon-${type} me-2`} />
      {count}
    </Button>
  );
};
ElementTypeLink.propTypes = {
  literature: PropTypes.instanceOf(Literature).isRequired,
  type: PropTypes.string
};
ElementTypeLink.defaultProps = {
  type: 'sample'
};

const CitationTable = ({ rows, sortedIds, userId, removeCitation }) => (
  <Table>
    <tbody>
      {sortedIds.map((id, k, ids) => {
        const citation = rows.get(id);
        const prevCit = (k > 0) ? rows.get(ids[k - 1]) : null;
        const sameRef = prevCit?.id === citation.id;
        const sameElement = prevCit
          && prevCit.element_id === citation.element_id
          && prevCit.element_type === citation.element_type;
        return sameRef && sameElement ? (
          <tr
            key={`header-${id}-${citation.id}`}
            className={`collapse cit_${citation.id}-${citation.element_type}_${citation.element_id}`}
          >
            <td />
            <td className="padding-right">
              <CitationUserRow literature={citation} userId={userId} />
            </td>
            <td>
              <Button
                size="xxsm"
                variant="danger"
                onClick={() => removeCitation(citation)}
              >
                <i className="fa fa-trash-o" />
              </Button>
            </td>
          </tr>
        ) : (
          <tr key={id}>
            <td>{sameElement ? null : <ElementLink literature={citation} />}</td>
            <td className="padding-right">
              <Citation literature={citation} />
            </td>
            <td />
          </tr>
        );
      })}
    </tbody>
  </Table>
);
CitationTable.propTypes = {
  sortedIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  rows: PropTypes.array.isRequired,
  userId: PropTypes.number.isRequired,
  removeCitation: PropTypes.func.isRequired,
};

export default class LiteratureDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...this.props.literatureMap,
      literature: Literature.buildEmpty(),
      sorting: 'element',
      sortedIds: [],
      selectedRefs: new Immutable.Map()
    };
    this.onClose = this.onClose.bind(this);
    this.handleUIStoreChange = this.handleUIStoreChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLiteratureAdd = this.handleLiteratureAdd.bind(this);
    this.handleLiteratureRemove = this.handleLiteratureRemove.bind(this);
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

  onClose() {
    DetailActions.close(this.props.literatureMap, true);
  }

  handleUIStoreChange(state) {
    const cCol = this.state.currentCollection;
    const { currentCollection, sorting } = state;

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
        const sortedIds = sortByElement(selectedRefs);
        this.setState(prevState => ({
          ...prevState,
          selectedRefs,
          currentCollection,
          sample: { ...sample },
          reaction: { ...reaction },
          sortedIds
        }));
      });
    }
    return null;
  }

  handleLiteratureRemove(literature) {
    const { element_type, element_id } = literature;
    LiteraturesFetcher.deleteElementReference({ element: { type: element_type.toLowerCase(), id: element_id }, literature })
      .then(() => {
        this.setState(prevState => ({
          ...prevState,
          literatures: prevState.selectedRefs.delete(literature.literal_id),
          sortedIds: sortByElement(prevState.selectedRefs.delete(literature.literal_id))
        }));
      });
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
      case 'litype':
        literature.litype = value;
        break;
      default:
        break;
    }
    this.setState(prevState => ({ ...prevState, literature }));
  }

  handleLiteratureAdd(literature) {
    const { doi } = literature;

    const { currentCollection, sample, reaction } = UIStore.getState();
    const params = {
      sample,
      reaction,
      id: currentCollection.id,
      is_sync_to_me: currentCollection.is_sync_to_me,
      ref: { ...literature, doi: sanitizeDoi(doi || '') }
    };
    LiteraturesFetcher.postReferencesByUIState(params).then((selectedRefs) => {
      this.setState(prevState => ({
        ...prevState,
        selectedRefs,
        currentCollection,
        sample: { ...sample },
        reaction: { ...reaction },
        sortedIds: sortByElement(selectedRefs),
      }));
    });
  }

  fetchDOIMetadata() {
    const { doi } = this.state.literature;
    NotificationActions.removeByUid('literature');
    Cite.async(sanitizeDoi(doi)).then((json) => {
      if (json.data && json.data.length > 0) {
        const citation = new Cite(json.data[0]);
        const { title, year } = json.data[0];
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
        this.handleLiteratureAdd(this.state.literature);
      }
    }).catch(() => {
      const notification = {
        title: 'Add References for selected Elements',
        message: `unable to fetch metadata for this doi: ${doi}`,
        level: 'error',
        dismissible: 'button',
        autoDismiss: 5,
        position: 'tr',
        uid: 'literature'
      };
      NotificationActions.add(notification);
    });
  }

  renderSectionHeader(title, clipboardText) {
    return (
      <div className="d-flex flex-grow-1 align-items-baseline justify-content-between">
        {title}
        <OverlayTrigger
          placement="bottom"
          overlay={
            <Tooltip id="assign_button">copy to clipboard</Tooltip>
          }
        >
          <Button
            size="sm"
            active
            className="me-2"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(clipboardText);
            }}
          >
            <i className="fa fa-clipboard" />
          </Button>
        </OverlayTrigger>
      </div>
    );
  }

  render() {
    const {
      sampleRefs,
      reactionRefs,
      selectedRefs,
      sortedIds,
      currentCollection,
      literature
    } = this.state;
    const { currentUser } = UserStore.getState();
    const label = currentCollection ? currentCollection.label : null;
    let contentSamples = '';
    sampleRefs.forEach((citation) => {
      contentSamples = `${contentSamples}\n${literatureContent(citation, true)}`;
    });
    let contentReactions = '';
    reactionRefs.forEach((citation) => {
      contentReactions = `${contentReactions}\n${literatureContent(citation, true)}`;
    });
    const elements = [];
    let contentElements = '';

    selectedRefs.forEach((citation) => {
      elements.push(literatureContent(citation, true));
    });

    uniqBy(elements).forEach((element) => {
      contentElements = `${contentElements}\n${element}`;
    });

    return (
      <DetailCard
        header={(
          <div className="d-flex justify-content-between">
            <span>
              <i className="fa fa-book me-1" />
              Literature Management for collection '{label}'
            </span>
            <Button
              key="closeBtn"
              onClick={this.onClose}
              variant="danger"
              size="xxsm"
            >
              <i className="fa fa-times" />
            </Button>
          </div>
        )}
      >
        <Accordion>
          <Accordion.Item eventKey="2">
            <Accordion.Header>
              {this.renderSectionHeader('References for samples', contentSamples)}
            </Accordion.Header>
            <Accordion.Body>
              {sampleRefs.map((lit) => (
                <Row key={`sampleRef-${lit.id}`} className="mb-3">
                  <Col xs={1}><ElementTypeLink literature={lit} type="sample" /></Col>
                  <Col xs={11}><Citation literature={lit} /></Col>
                </Row>
              ))}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>
              {this.renderSectionHeader('References for reactions', contentReactions)}
            </Accordion.Header>
            <Accordion.Body>
              {reactionRefs.map((lit) => (
                <Row key={`reactionRef-${lit.id}`} className="mb-3">
                  <Col xs={1}><ElementTypeLink literature={lit} type="reaction" /></Col>
                  <Col xs={11}><Citation literature={lit} /></Col>
                </Row>
              ))}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="4">
            <Accordion.Header>
              {this.renderSectionHeader('References for selected elements', contentElements)}
            </Accordion.Header>
            <Accordion.Body>
              <ListGroup>
                <ListGroupItem>
                  <Row>
                    <Col md={8} style={{ paddingRight: 0 }}>
                      <LiteratureInput
                        handleInputChange={this.handleInputChange}
                        literature={literature}
                        field="doi"
                        placeholder="DOI: 10.... or  http://dx.doi.org/10... or 10. ..."
                      />
                    </Col>
                    <Col md={3} style={{ paddingRight: 0 }}>
                      <LiteralType
                        handleInputChange={this.handleInputChange}
                        disabled={false}
                        val={literature.litype}
                      />
                    </Col>
                    <Col md={1} style={{ paddingRight: 0 }}>
                      <Button
                        variant="success"
                        size="sm"
                        style={{ marginTop: 2 }}
                        onClick={this.fetchDOIMetadata}
                        title="fetch metadata for this doi and add citation to selection"
                        disabled={!doiValid(literature.doi)}
                      >
                        <i className="fa fa-plus" />
                      </Button>
                    </Col>
                    <Col md={12} style={{ paddingRight: 0 }}>
                      <Citation literature={literature} />
                    </Col>
                    <Col md={7} style={{ paddingRight: 0 }}>
                      <LiteratureInput
                        handleInputChange={this.handleInputChange}
                        literature={literature}
                        field="title"
                        placeholder="Title..."
                      />
                    </Col>
                    <Col md={4} style={{ paddingRight: 0 }}>
                      <LiteratureInput
                        handleInputChange={this.handleInputChange}
                        literature={literature}
                        field="url"
                        placeholder="URL..."
                      />
                    </Col>
                    <Col md={1}>
                      <AddButton
                        onLiteratureAdd={this.handleLiteratureAdd}
                        literature={literature}
                        title="add citation to selection"
                      />
                    </Col>
                  </Row>
                </ListGroupItem>
              </ListGroup>
              <CitationTable
                rows={selectedRefs}
                sortedIds={sortedIds}
                removeCitation={this.handleLiteratureRemove}
                userId={currentUser.id}
              />
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </DetailCard>
    );
  }
}

LiteratureDetails.propTypes = {
  literatureMap: PropTypes.instanceOf(LiteratureMap).isRequired
};

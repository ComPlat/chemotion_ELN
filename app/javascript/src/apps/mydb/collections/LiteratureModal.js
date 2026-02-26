import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Accordion,
  Table,
  Button,
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
  sanitizeDoi,
  sortByElement,
  literatureContent
} from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import Literature from 'src/models/Literature';
import LiteraturesFetcher from 'src/fetchers/LiteraturesFetcher';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { copyToClipboard } from 'src/utilities/clipboard';

const Cite = require('citation-js');

const findCollectionById = (collections, collectionId) => {
  if (!collections || collections.length === 0) return null;

  for (let index = 0; index < collections.length; index += 1) {
    const collection = collections[index];
    if (collection.id === collectionId) return collection;
    const childCollection = findCollectionById(collection.children, collectionId);
    if (childCollection) return childCollection;
  }

  return null;
};

const resolveCollectionById = (collectionId) => {
  const {
    lockedRoots, unsharedRoots, sharedRoots, remoteRoots, syncInRoots
  } = CollectionStore.getState();
  const allRoots = [lockedRoots, unsharedRoots, sharedRoots, remoteRoots, syncInRoots]
    .filter(Boolean)
    .flat();

  return findCollectionById(allRoots, collectionId) || { id: collectionId, is_sync_to_me: false };
};

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

export default class LiteratureModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sampleRefs: [],
      reactionRefs: [],
      selectedRefs: new Immutable.Map(),
      literature: Literature.buildEmpty(),
      sorting: 'element',
      sortedIds: [],
      currentCollection: null,
      sample: {},
      reaction: {}
    };
    this.handleUIStoreChange = this.handleUIStoreChange.bind(this);
    this.handleLiteratureAdd = this.handleLiteratureAdd.bind(this);
    this.fetchDOIMetadata = this.fetchDOIMetadata.bind(this);
  }

  componentDidMount() {
    const { collectionId } = this.props;
    const { sample, reaction } = UIStore.getState();
    const currentCollection = resolveCollectionById(collectionId);

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

  handleUIStoreChange(state) {
    const { collectionId } = this.props;
    const currentCollection = this.state.currentCollection || resolveCollectionById(collectionId);
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

  handleLiteratureAdd(literature) {
    const { doi } = literature;
    const { collectionId } = this.props;

    const currentCollection = this.state.currentCollection || resolveCollectionById(collectionId);
    const { sample, reaction } = UIStore.getState();
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

  static renderSectionHeader(title, clipboardText) {
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
    const { show, onHide } = this.props;
    const {
      sampleRefs,
      reactionRefs,
      selectedRefs,
      currentCollection
    } = this.state;

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

    const label = currentCollection?.label || '';

    return (
      <Modal show={show} onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fa fa-book me-2" />
            {`Literature Report for collection ${label}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Accordion>
            <Accordion.Item eventKey="2">
              <Accordion.Header>
                {LiteratureModal.renderSectionHeader('References for samples', contentSamples)}
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
                {LiteratureModal.renderSectionHeader('References for reactions', contentReactions)}
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
          </Accordion>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onHide}>
            Done
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

LiteratureModal.propTypes = {
  collectionId: PropTypes.number.isRequired,
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired
};

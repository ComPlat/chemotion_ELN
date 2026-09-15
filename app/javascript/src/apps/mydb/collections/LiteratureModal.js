import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  Button,
  Row,
  Col
} from 'react-bootstrap';
import { Map } from 'immutable';
import { uniqBy } from 'lodash';
import AppModal from 'src/components/common/AppModal';
import {
  Citation,
  sanitizeDoi,
  sortByElement,
  literatureContent
} from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import Literature from 'src/models/Literature';
import LiteraturesFetcher from 'src/fetchers/LiteraturesFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import { StoreContext } from 'src/stores/mobx/RootStore';
import CopyButton from 'src/components/common/CopyButton';

const Cite = require('citation-js');

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

export default class LiteratureModal extends Component {
  static contextType = StoreContext;
  constructor(props) {
    super(props);
    this.state = {
      sampleRefs: [],
      reactionRefs: [],
      selectedRefs: Map(),
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
    const currentCollection = { id: collectionId };

    this.context.notifications.removeByUid('literature');
    LiteraturesFetcher.fetchReferencesByCollection(currentCollection).then((literatures) => {
      this.setState(prevState => ({
        ...prevState,
        ...literatures,
        currentCollection,
        sample: { ...sample },
        reaction: { ...reaction },
      }));
    }).catch((error) => {
      // Without this the modal opened empty and said nothing: the rejection was unhandled and
      // setState never ran.
      this.context.notifications.add({
        title: 'Reference Report',
        message: error.message || 'Could not load the references for this collection',
        level: 'error',
        autoDismiss: 5,
        position: 'tr',
        uid: 'literature',
      });
    });
    UIStore.listen(this.handleUIStoreChange);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.handleUIStoreChange);
  }

  handleUIStoreChange(state) {
    const { collectionId } = this.props;
    const currentCollection = this.state.currentCollection || { id: collectionId };
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

    const currentCollection = this.state.currentCollection || { id: collectionId };
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
    this.context.notifications.removeByUid('literature');
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
        autoDismiss: 5,
        position: 'tr',
        uid: 'literature'
      };
      this.context.notifications.add(notification);
    });
  }

  static renderSectionHeader(title, clipboardText) {
    return (
      <div className="d-flex flex-grow-1 align-items-baseline justify-content-between">
        {title}
        <CopyButton
          text={clipboardText}
          placement="bottom"
          tooltipId={`copy-${title.replace(/\s+/g, '-')}`}
          size="sm"
          className="me-2"
          active
        />
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
      <AppModal
        show={show}
        onHide={onHide}
        size="lg"
        title={(
          <>
            <i className="fa fa-book me-2" />
            {`Reference Report for collection ${label}`}
          </>
        )}
      >
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
      </AppModal>
    );
  }
}

LiteratureModal.propTypes = {
  collectionId: PropTypes.number.isRequired,
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired
};

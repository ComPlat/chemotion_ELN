import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  Button,
  ListGroup,
  ListGroupItem,
  Row,
  Col
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
    this.loadSelectedReferences = this.loadSelectedReferences.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLiteratureAdd = this.handleLiteratureAdd.bind(this);
    this.handleLiteratureRemove = this.handleLiteratureRemove.bind(this);
    this.fetchDOIMetadata = this.fetchDOIMetadata.bind(this);
  }

  loadSelectedReferences(currentCollection, sample, reaction) {
    if (!currentCollection) return;

    const params = {
      sample,
      reaction,
      id: currentCollection.id,
      is_sync_to_me: currentCollection.is_sync_to_me
    };

    LiteraturesFetcher.postReferencesByUIState(params).then((selectedRefs) => {
      this.setState((prevState) => ({
        ...prevState,
        selectedRefs,
        currentCollection,
        sample: { ...sample },
        reaction: { ...reaction },
        sortedIds: sortByElement(selectedRefs)
      }));
    });
  }

  componentDidMount() {
    const { currentCollection, sample, reaction } = UIStore.getState();
    this.loadSelectedReferences(currentCollection, sample, reaction);
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
    const { currentCollection } = state;
    if (!currentCollection) return null;
    const { sample, reaction } = state;

    if (cCol && currentCollection &&
      (cCol.id !== currentCollection.id || cCol.is_sync_to_me !== currentCollection.is_sync_to_me)
    ) {
      this.loadSelectedReferences(currentCollection, sample, reaction);
      return null;
    }

    const prevSample = this.state.sample;
    const prevReaction = this.state.reaction;

    if (prevSample.checkedIds !== sample.checkedIds
      || prevSample.unCheckedIds !== sample.unCheckedIds
      || prevSample.checkedAll !== sample.checkedAll
      || prevReaction.checkedIds !== reaction.checkedIds
      || prevReaction.unCheckedIds !== reaction.unCheckedIds
      || prevReaction.checkedAll !== reaction.checkedAll
    ) {
      this.loadSelectedReferences(currentCollection, sample, reaction);
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

  literatureHeader() {
    return (
      <div className="d-flex justify-content-between">
        <span>
          <i className="fa fa-book me-1" />
          References for selected elements
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
    );
  }

  render() {
    const {
      selectedRefs,
      sortedIds,
      literature
    } = this.state;
    const { currentUser } = UserStore.getState();
    const elements = [];
    let contentElements = '';

    selectedRefs.forEach((citation) => {
      elements.push(literatureContent(citation, true));
    });

    uniqBy(elements).forEach((element) => {
      contentElements = `${contentElements}\n${element}`;
    });

    return (
      <DetailCard header={this.literatureHeader()}>
        <Row className="mb-2 align-items-center">
          <Col xs={8}>
            <LiteratureInput
              handleInputChange={this.handleInputChange}
              literature={literature}
              field="doi"
              placeholder="DOI: 10.... or  http://dx.doi.org/10... or 10. ..."
            />
          </Col>
          <Col xs={3}>
            <LiteralType
              handleInputChange={this.handleInputChange}
              disabled={false}
              val={literature.litype}
            />
          </Col>
          <Col xs={1}>
            <Button
              variant="success"
              onClick={this.fetchDOIMetadata}
              title="fetch metadata for this doi and add citation to selection"
              disabled={!doiValid(literature.doi)}
            >
              <i className="fa fa-plus" />
            </Button>
          </Col>
        </Row>
        <Row className="mb-2 align-items-center">
          <Col xs={12}>
            <Citation literature={literature} />
          </Col>
        </Row>
        <Row className="mb-2 align-items-center">
          <Col xs={7}>
            <LiteratureInput
              handleInputChange={this.handleInputChange}
              literature={literature}
              field="title"
              placeholder="Title..."
            />
          </Col>
          <Col xs={4}>
            <LiteratureInput
              handleInputChange={this.handleInputChange}
              literature={literature}
              field="url"
              placeholder="URL..."
            />
          </Col>
          <Col xs={1}>
            <AddButton
              onLiteratureAdd={this.handleLiteratureAdd}
              literature={literature}
              title="add citation to selection"
            />
          </Col>
        </Row>
        <CitationTable
          rows={selectedRefs}
          sortedIds={sortedIds}
          removeCitation={this.handleLiteratureRemove}
          userId={currentUser.id}
        />
        <div className="lmt-3 d-flex justify-content-end">
          <Button
            size="sm"
            onClick={() => copyToClipboard(selectedRefs)}
          >
            <i className="fa fa-clipboard me-2" />
            Copy References to Clipboard
          </Button>
        </div>
      </DetailCard>
    );
  }
}

LiteratureDetails.propTypes = {
  literatureMap: PropTypes.instanceOf(LiteratureMap).isRequired
};

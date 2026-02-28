/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Row, Col } from 'react-bootstrap';
import uuid from 'uuid';
import Immutable from 'immutable';
import {
  Citation, doiValid, sanitizeDoi, groupByCitation, AddButton, LiteratureInput, LiteralType
} from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import ResearchPlan from 'src/models/ResearchPlan';
import CellLine from 'src/models/cellLine/CellLine';
import Literature from 'src/models/Literature';
import LiteraturesFetcher from 'src/fetchers/LiteraturesFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import CitationPanel from 'src/apps/mydb/elements/details/literature/CitationPanel';
import { createCitationTypeMap } from 'src/apps/mydb/elements/details/literature/CitationTools';

const Cite = require('citation-js');
require('@citation-js/plugin-isbn');

const notification = (message) => ({
  title: 'Add Literature',
  message,
  level: 'error',
  dismissible: 'button',
  autoDismiss: 5,
  position: 'tr',
  uid: uuid.v4()
});

const warningNotification = (message) => ({
  title: '',
  message,
  level: 'warning',
  dismissible: 'button',
  autoDismiss: 5,
  position: 'tr',
  uid: uuid.v4()
});

const checkElementStatus = (element) => {
  const type = element.type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  if (element.isNew) {
    NotificationActions.add(notification(`Create ${type} first.`));
    return false;
  }
  return true;
};

export default class DetailsTabLiteratures extends Component {
  constructor(props) {
    super(props);

    this.state = {
      literature: this.createEmptyLiterature(this.props.element.type),
      literatures: new Immutable.Map(),
      sortedIds: [],
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleTypeUpdate = this.handleTypeUpdate.bind(this);
    this.handleLiteratureAdd = this.handleLiteratureAdd.bind(this);
    this.handleLiteratureRemove = this.handleLiteratureRemove.bind(this);
    this.fetchDOIMetadata = this.fetchDOIMetadata.bind(this);
    this.fetchISBNMetadata = this.fetchISBNMetadata.bind(this);
    this.fetchMetadata = this.fetchMetadata.bind(this);
  }

  componentDidMount() {
    const { literatures, element } = this.props;
    if (literatures && literatures.size > 0) {
      const sortedIds = groupByCitation(literatures);
      this.setState((prevState) => ({
        ...prevState,
        literatures,
        sortedIds,
        sorting: 'literature_id'
      }));
    } else {
      LiteraturesFetcher.fetchElementReferences(element).then((fetchedLiterature) => {
        const sortedIds = groupByCitation(fetchedLiterature);
        this.setState((prevState) => ({
          ...prevState,
          literatures: fetchedLiterature,
          sortedIds,
          sorting: 'literature_id'
        }));
      });
    }
  }

  createEmptyLiterature(elementType) {
    const literature = Literature.buildEmpty();
    literature.litype = Object.keys(createCitationTypeMap(elementType))[0];
    return literature;
  }

  handleInputChange(type, event) {
    const { literature } = this.state;
    const { value } = event.target;
    literature[type] = value;
    this.setState((prevState) => ({ ...prevState, literature }));
  }

  handleTypeUpdate(updId, rType) {
    const { element } = this.props;
    if (!checkElementStatus(element)) { return; }
    LoadingActions.start();
    const params = {
      element_id: element.id, element_type: element.type, id: updId, litype: rType
    };
    LiteraturesFetcher.updateReferenceType(params)
      .then((literatures) => {
        this.setState(
          {
            literatures,
            sortedIds: groupByCitation(literatures),
            sorting: 'literature_id'
          },
          LoadingActions.stop()
        );
      });
  }

  handleLiteratureRemove(literature) {
    const { element } = this.props;
    if (!checkElementStatus(element)) { return; }
    if (Number.isNaN(element.id) && ['reaction', 'sample', 'research_plan'].includes(element.type)) {
      this.setState((prevState) => ({
        ...prevState,
        literatures: prevState.literatures.delete(literature.literal_id),
        sortedIds: groupByCitation(prevState.literatures.delete(literature.literal_id))
      }));
      if (['reaction', 'sample', 'research_plan'].includes(element.type)) {
        element.literatures = element.literatures && element.literatures.delete(literature.literal_id);
        this.setState({
          [element.type]: element
        });
      }
    } else {
      LiteraturesFetcher.deleteElementReference({ element, literature })
        .then(() => {
          this.setState((prevState) => ({
            ...prevState,
            literatures: prevState.literatures.delete(literature.literal_id),
            sortedIds: groupByCitation(prevState.literatures.delete(literature.literal_id))
          }));
        })
        .then(() => { NotificationActions.add(warningNotification('Literature entry successfully removed')); })
        .catch((errorMessage) => {
          NotificationActions.add(notification(errorMessage.error));
        });
    }
  }

  handleLiteratureAdd(literature) {
    const { element } = this.props;
    if (!checkElementStatus(element)) { return; }
    const {
      doi, url, title, isbn
    } = literature;
    if (element.isNew === true && ['reaction', 'sample', 'research_plan'].includes(element.type)
      && element.literatures && element.literatures.size > 0) {
      const newlit = {
        ...literature,
        doi: sanitizeDoi(doi),
        url: url.trim().replace(/ +/g, ' '),
        title: title.trim().replace(/ +/g, ' '),
        isbn: isbn.trim()
      };
      const objliterature = new Literature(newlit);
      element.literatures = element.literatures.set(objliterature.id, objliterature);
      this.setState((prevState) => ({
        ...prevState,
        literature: Literature.buildEmpty(),
        literatures: prevState.literatures.set(objliterature.id, objliterature),
        sortedIds: groupByCitation(prevState.literatures.set(objliterature.id, objliterature))
      }));
    } else {
      LiteraturesFetcher.postElementReference({
        element,
        literature: {
          ...literature,
          doi: sanitizeDoi(doi),
          url: url.trim().replace(/ +/g, ' '),
          title: title.trim().replace(/ +/g, ' '),
          isbn: isbn.trim()
        },
      }).then((literatures) => {
        this.setState(() => ({
          literature: this.createEmptyLiterature(this.props.element.type),
          literatures,
          sortedIds: groupByCitation(literatures),
          sorting: 'literature_id'
        }));
      }).catch((errorMessage) => {
        NotificationActions.add(notification(errorMessage.error));
        this.setState({ literature: this.createEmptyLiterature(this.props.element.type) });
      });
    }
  }

  fetchMetadata() {
    const { element } = this.props;
    const { literature } = this.state;
    if (!checkElementStatus(element)) { return; }

    if (doiValid(literature.doi_isbn)) {
      this.fetchDOIMetadata(literature.doi_isbn);
    } else {
      this.fetchISBNMetadata(literature.doi_isbn);
    }
  }

  fetchDOIMetadata(doi) {
    NotificationActions.removeByUid('literature');
    LoadingActions.start();
    Cite.async(sanitizeDoi(doi)).then((json) => {
      if (json.data && json.data.length > 0) {
        const data = json.data[0];
        const citation = new Cite(data);
        this.setState((prevState) => ({
          ...prevState,
          literature: {
            ...prevState.literature,
            doi,
            title: data.title || '',
            year: (data && data.issued && data.issued['date-parts'][0]) || '',
            refs: { citation, bibtex: citation.format('bibtex'), bibliography: json.format('bibliography') }
          }
        }));
        const { literature } = this.state;
        this.handleLiteratureAdd(literature);
      }
    }).catch((errorMessage) => {
      NotificationActions.add(notification(`unable to fetch metadata for this doi: ${doi}, error: ${errorMessage}`));
    }).finally(() => {
      LoadingActions.stop();
    });
  }

  fetchISBNMetadata(isbn) {
    NotificationActions.removeByUid('literature');
    LoadingActions.start();
    Cite.async(isbn).then((json) => {
      if (json.data && json.data.length > 0) {
        const data = json.data[0];
        this.setState((prevState) => ({
          ...prevState,
          literature: {
            ...prevState.literature,
            isbn,
            title: data.title || '',
            year: (data && data.issued && data.issued['date-parts'][0]) || '',
            url: (data && data.URL) || '',
            refs: { citation: json, bibtex: json.format('bibtex'), bibliography: json.format('bibliography') }
          }
        }));
        const { literature } = this.state;
        this.handleLiteratureAdd(literature);
      }
    }).catch((errorMessage) => {
      NotificationActions.add(notification(`unable to fetch metadata for this ISBN: ${isbn}, error: ${errorMessage}`));
    }).finally(() => {
      LoadingActions.stop();
    });
  }

  render() {
    const { literature, literatures, sortedIds } = this.state;
    const { currentUser } = UserStore.getState();
    const isInvalidDoi = !(doiValid(literature.doi_isbn || ''));
    const isInvalidIsbn = !(/^[0-9]([0-9]|-(?!-))+$/.test(literature.doi_isbn || ''));
    const { readOnly } = this.props;
    const citationTypeMap = createCitationTypeMap(this.props.element.type);
    return (
      <>
        <Row className="mb-2">
          <Col xs={8}>
            <LiteratureInput
              handleInputChange={this.handleInputChange}
              literature={literature}
              field="doi_isbn"
              readOnly={readOnly}
              placeholder="DOI: 10.... or  http://dx.doi.org/10... or 10. ... or ISBN: 978 ..."
            />
          </Col>
          <Col xs={3}>
            <LiteralType
              handleInputChange={this.handleInputChange}
              disabled={readOnly}
              val={literature.litype}
              citationMap={citationTypeMap}
            />
          </Col>
          <Col xs={1}>
            <Button
              variant="success"
              onClick={this.fetchMetadata}
              title="fetch metadata for this doi or ISBN(open services) and add citation to selection"
              disabled={(isInvalidDoi && isInvalidIsbn) || readOnly}
            >
              <i className="fa fa-plus" aria-hidden="true" />
            </Button>
          </Col>
        </Row>
        <Row className="mb-2">
          <Col>
            <Citation literature={literature} />
          </Col>
        </Row>
        <Row className="mb-2">
          <Col xs={7}>
            <LiteratureInput
              handleInputChange={this.handleInputChange}
              literature={literature}
              field="title"
              readOnly={readOnly}
              placeholder="Title..."
            />
          </Col>
          <Col xs={4}>
            <LiteratureInput
              handleInputChange={this.handleInputChange}
              literature={literature}
              field="url"
              readOnly={readOnly}
              placeholder="URL..."
            />
          </Col>
          <Col md={1}>
            <AddButton
              readOnly={readOnly}
              onLiteratureAdd={this.handleLiteratureAdd}
              literature={literature}
            />
          </Col>
        </Row>
        {
          Object.keys(citationTypeMap)
            .map((e) => (
              <CitationPanel
                key={`_citation_panel_${e}`}
                title={e}
                fnDelete={this.handleLiteratureRemove}
                sortedIds={sortedIds}
                rows={literatures}
                readOnly={readOnly}
                uid={currentUser && currentUser.id}
                fnUpdate={this.handleTypeUpdate}
                citationMap={citationTypeMap[e]}
                typeMap={citationTypeMap}
              />
            ))
        }
      </>
    )
  }
}

DetailsTabLiteratures.propTypes = {
  element: PropTypes.oneOfType([
    PropTypes.instanceOf(ResearchPlan),
    PropTypes.instanceOf(Reaction),
    PropTypes.instanceOf(CellLine),
    PropTypes.instanceOf(Sample)
  ]).isRequired,
  literatures: PropTypes.array,
  readOnly: PropTypes.bool
};

DetailsTabLiteratures.defaultProps = {
  readOnly: false,
  literatures: []
};

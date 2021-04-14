import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  ListGroup,
  ListGroupItem,
  Button,
  Row,
  Col,
  Glyphicon,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import uuid from 'uuid';
import Immutable from 'immutable';
import Cite from 'citation-js';
import {
  Citation,
  CitationUserRow,
  doiValid,
  sanitizeDoi,
  groupByCitation,
  AddButton,
  LiteratureInput,
  LiteralType,
  literatureContent
} from './LiteratureCommon';
import Sample from './models/Sample';
import Reaction from './models/Reaction';
import ResearchPlan from './models/ResearchPlan';
import Literature from './models/Literature';
import LiteraturesFetcher from './fetchers/LiteraturesFetcher';
import UserStore from './stores/UserStore';
import NotificationActions from './actions/NotificationActions';
import LoadingActions from './actions/LoadingActions';

const CiteCore = require('@citation-js/core');
require('@citation-js/plugin-isbn');

const notification = message => ({
  title: 'Add Literature',
  message,
  level: 'error',
  dismissible: 'button',
  autoDismiss: 5,
  position: 'tr',
  uid: uuid.v4()
});

const clipboardTooltip = () => {
  return (
    <Tooltip id="assign_button">copy to clipboard</Tooltip>
  )
}

const CitationTable = ({ rows, sortedIds, userId, removeCitation }) => (
  <Table>
    <thead><tr>
      <th width="90%"></th>
      <th width="10%"></th>
    </tr></thead>
    <tbody>
      {sortedIds.map((id, k, ids) => {
        const citation = rows.get(id)
        const prevCit = (k > 0) ? rows.get(ids[k-1]) : null
        const sameRef = prevCit && prevCit.id === citation.id
        const content = literatureContent(citation, true);
        return sameRef ? (
          <tr key={`header-${id}-${citation.id}`} className={`collapse literature_id_${citation.id}`}>
            <td className="padding-right">
              <CitationUserRow literature={citation} userId={userId} />
            </td>
            <td>
              <Button
                bsSize="small"
                bsStyle="danger"
                onClick={() => removeCitation(citation)}
              >
                <i className="fa fa-trash-o" />
              </Button>
            </td>
          </tr>
        ) : (
          <tr key={id} className={``}>
            <td className="padding-right">
              <Citation literature={citation}/>
            </td>
            <td>
              <Button
                data-toggle="collapse"
                data-target={`.literature_id_${citation.id}`}
                bsSize="sm"
              >
                <Glyphicon
                  glyph={   true  ? 'chevron-right' : 'chevron-down' }
                  title="Collapse/Uncollapse"
                  // onClick={() => this.collapseSample(sampleCollapseAll)}
                  style={{
                    // fontSize: '20px',
                    cursor: 'pointer',
                    color: '#337ab7',
                    top: 0
                  }}
                />
              </Button>
              <OverlayTrigger placement="bottom" overlay={clipboardTooltip()}>
                <Button bsSize="small" active className="clipboardBtn" data-clipboard-text={content} >
                  <i className="fa fa-clipboard" aria-hidden="true" />
                </Button>
              </OverlayTrigger>
            </td>
          </tr>
        );
      })}
    </tbody>
  </Table>
);
CitationTable.propTypes = {
  rows: PropTypes.instanceOf(Immutable.Map),
  sortedIds: PropTypes.array,
  userId: PropTypes.number,
  removeCitation: PropTypes.func
};

CitationTable.defaultProps = {
  rows: new Immutable.Map(),
  sortedIds: [],
  userId: 0
};

const sameConseqLiteratureId = (citations, sortedIds, i) => {
  if (i === 0) { return false; }
  const a = citations.get(sortedIds[i])
  const b = citations.get(sortedIds[i-1])
  return (a.id === b.id)
};

const checkElementStatus = (element) => {
  const type = element.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
      literature: Literature.buildEmpty(),
      literatures: new Immutable.Map(),
      sortedIds: [],
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLiteratureAdd = this.handleLiteratureAdd.bind(this);
    this.handleLiteratureRemove = this.handleLiteratureRemove.bind(this);
    this.fetchDOIMetadata = this.fetchDOIMetadata.bind(this);
    this.fetchISBNMetadata = this.fetchISBNMetadata.bind(this);
    this.fetchMetadata = this.fetchMetadata.bind(this);
  }

  componentDidMount() {
    if (this.props.literatures && this.props.literatures.size > 0) {
      const sortedIds = groupByCitation(this.props.literatures);
      this.setState(prevState => ({
        ...prevState,
        literatures: this.props.literatures,
        sortedIds,
        sorting: 'literature_id'
      }));
    } else {
      LiteraturesFetcher.fetchElementReferences(this.props.element).then((literatures) => {
        const sortedIds = groupByCitation(literatures);
        this.setState(prevState => ({
          ...prevState,
          literatures,
          sortedIds,
          sorting: 'literature_id'
        }));
      });
    }
  }

  handleInputChange(type, event) {
    const { literature } = this.state;
    const { value } = event.target;
    literature[type] = value.trim();
    this.setState(prevState => ({ ...prevState, literature }));
  }

  handleLiteratureRemove(literature) {
    const { element } = this.props;
    if (isNaN(element.id) && element.type === 'reaction') {
      this.setState(prevState => ({
        ...prevState,
        literatures: prevState.literatures.delete(literature.literal_id),
        sortedIds: groupByCitation(prevState.literatures.delete(literature.literal_id))
      }));
      if (element.type === 'reaction') {
        element.literatures = element.literatures && element.literatures.delete(literature.literal_id);
        this.setState({
          reaction: element
        })
      }
    } else {
      LiteraturesFetcher.deleteElementReference({ element, literature })
        .then(() => {
          this.setState(prevState => ({
            ...prevState,
            literatures: prevState.literatures.delete(literature.literal_id),
            sortedIds: groupByCitation(prevState.literatures.delete(literature.literal_id))
          }));
        });
    }
  }

  handleLiteratureAdd(literature) {
    const { element } = this.props;
    if (!checkElementStatus(element)) {
      return;
    }
    const { doi, url, title, isbn } = literature;
    if (element.isNew === true && element.type === 'reaction'
    && element.literatures && element.literatures.size > 0) {
      const newlit = {
        ...literature,
        doi: sanitizeDoi(doi),
        url: url.trim().replace(/ +/g, ' '),
        title: title.trim().replace(/ +/g, ' '),
        isbn
      };
      const objliterature = new Literature(newlit);
      element.literatures = element.literatures.set(objliterature.id, objliterature);
      this.setState(prevState => ({
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
          isbn
        },
      }).then((literatures) => {
        this.setState(() => ({
          literature: Literature.buildEmpty(),
          literatures,
          sortedIds: groupByCitation(literatures),
          sorting: 'literature_id'
        }));
      }).catch((errorMessage) => {
        NotificationActions.add(notification(errorMessage.error));
        this.setState({ literature: Literature.buildEmpty() });
      });
    }
  }

  fetchMetadata() {
    const { element } = this.props;
    if (!checkElementStatus(element)) {
      return;
    }
    const { doi_isbn } = this.state.literature;
    if (doiValid(doi_isbn)) {
      this.fetchDOIMetadata(doi_isbn);
    } else {
      this.fetchISBNMetadata(doi_isbn);
    }
  }

  fetchDOIMetadata(doi) {
    NotificationActions.removeByUid('literature');
    LoadingActions.start();
    Cite.inputAsync(sanitizeDoi(doi)).then((json) => {
      LoadingActions.stop();
      if (json[0]) {
        const citation = new Cite(json[0]);
        const { title, year } = json[0];
        this.setState(prevState => ({
          ...prevState,
          literature: {
            ...prevState.literature,
            doi,
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
    }).catch((errorMessage) => {
      LoadingActions.stop();
      NotificationActions.add(notification(`unable to fetch metadata for this doi: ${doi}`));
    });
  }

  fetchISBNMetadata(isbn) {
    NotificationActions.removeByUid('literature');
    LoadingActions.start();
    CiteCore.Cite.async(isbn).then((json) => {
      LoadingActions.stop();
      if (json.data && json.data.length > 0) {
        const citation = new Cite(json.data);
        this.setState(prevState => ({
          ...prevState,
          literature: {
            ...prevState.literature,
            isbn,
            title: json.data[0].title || '',
            year: (json.data[0] && json.data[0].issued && json.data[0].issued['date-parts'][0]) || '',
            url: (json.data[0] && json.data[0].URL) || '',
            refs: {
              citation,
              bibtex: citation.format('bibtex')
            }
          }
        }));
        this.handleLiteratureAdd(this.state.literature);
      }
    }).catch((errorMessage) => {
      LoadingActions.stop();
      NotificationActions.add(notification(`unable to fetch metadata for this ISBN: ${isbn}`));
    });
  }

  render() {
    const { literature, literatures, sortedIds } = this.state;
    const { currentUser } = UserStore.getState();
    return (
      <ListGroup fill="true">
        <ListGroupItem>
          <CitationTable rows={literatures} sortedIds={sortedIds} removeCitation={this.handleLiteratureRemove} userId={currentUser.id} />
        </ListGroupItem>
        <ListGroupItem>
          <Row>
            <Col md={8} style={{ paddingRight: 0 }}>
              <LiteratureInput handleInputChange={this.handleInputChange} literature={literature} field="doi_isbn" placeholder="DOI: 10.... or  http://dx.doi.org/10... or 10. ... or ISBN: 978 ..." />
            </Col>
            <Col md={3} style={{ paddingRight: 0 }}>
              <LiteralType handleInputChange={this.handleInputChange} disabled={false} val={literature.litype} />
            </Col>
            <Col md={1} style={{ paddingRight: 0 }}>
              <Button
                bsStyle="success"
                bsSize="small"
                style={{ marginTop: 2 }}
                onClick={this.fetchMetadata}
                title="fetch metadata for this doi or ISBN(open services) and add citation to selection"
                disabled={!(doiValid(literature.doi_isbn || '') || /^[0-9]([0-9]|-(?!-))+$/.test(literature.doi_isbn || ''))}
              >
                <i className="fa fa-plus" aria-hidden="true" />
              </Button>
            </Col>
            <Col md={12} style={{ paddingRight: 0 }}>
              <Citation literature={literature} />
            </Col>
            <Col md={7} style={{ paddingRight: 0 }}>
              <LiteratureInput handleInputChange={this.handleInputChange} literature={literature} field="title" placeholder="Title..." />
            </Col>
            <Col md={4} style={{ paddingRight: 0 }}>
              <LiteratureInput handleInputChange={this.handleInputChange} literature={literature} field="url" placeholder="URL..." />
            </Col>
            <Col md={1}>
              <AddButton onLiteratureAdd={this.handleLiteratureAdd} literature={literature} />
            </Col>
          </Row>
        </ListGroupItem>
      </ListGroup>
    );
  }
}

DetailsTabLiteratures.propTypes = {
  element: PropTypes.oneOfType([
    PropTypes.instanceOf(ResearchPlan),
    PropTypes.instanceOf(Reaction),
    PropTypes.instanceOf(Sample)
  ]).isRequired,
  literatures: PropTypes.array
};

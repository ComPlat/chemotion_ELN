import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table, ListGroup, ListGroupItem, Button, Row, Col, FormControl, Glyphicon } from 'react-bootstrap';
import Immutable from 'immutable';
import Cite from 'citation-js';


import Literature from './models/Literature';
import LiteraturesFetcher from './fetchers/LiteraturesFetcher';


const handleInputChange = (type, event, literature) => {
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
    case 'year':
       literature.year = value;
    default:
      break;
  }
};

const TitleInput = ({ literature, handleInputChange }) => (
  <FormControl
    type="text"
    onChange={event => handleInputChange('title', event)}
    placeholder="Title..."
    value={literature.title || ''}
  />
);

const UrlInput = ({ literature, handleInputChange }) => (
  <FormControl
    type="text"
    onChange={event => handleInputChange('url', event)}
    placeholder="URL..."
    value={literature.url || ''}
  />
);

const DoiInput = ({ literature, handleInputChange }) => (
  <FormControl
    type="text"
    onChange={event => handleInputChange('doi', event)}
    placeholder="DOI: 10.... or  http://dx.doi.org/10... or 10. ..."
    value={literature.doi || ''}
  />
);

const isLiteratureValid = literature => (
  literature.title !== '' && literature.url.concat(literature.doi) !== ''
);

const AddButton = ({ onLiteratureAdd, literature }) => (
  <Button
    bsStyle="success"
    bsSize="small"
    onClick={() => onLiteratureAdd(literature)}
    style={{ marginTop: 2 }}
    disabled={!isLiteratureValid(literature)}
  >
    <i className="fa fa-plus" />
  </Button>
);


AddButton.propTypes = {
  onLiteratureAdd: PropTypes.func.isRequired,
  literature: PropTypes.object.isRequired
};


const literatureUrl = (literature) => {
  const { url } = literature;
  if (url.match(/https?\:\/\//)) {
    return url;
  }
  return `//${url}`;
};

const sanitizeDoi = (doi) => {
  const m = doi.match(/(?:\.*10\.)(\S+)\s*/);
  return m ? '10.'.concat(m[1]) : null;
};

const doiValid = (doi) => {
  const sanitized = sanitizeDoi(doi);
  return sanitized && sanitized.match(/10.\w+\/\S+/) && true;
};

const Citation = ({ literature }) => {
  const { title, year, doi, url, refs } = literature;
  const formatedDoi = doi ? `https://dx.doi.org/${sanitizeDoi(doi)}` : null;
  const link = formatedDoi || url;
  let content;
  if (refs && refs.citation) {
    content = (
      <div>
        {refs.citation.format('bibliography', {
           format: 'text',
           template: 'apa',
        })}
      </div>
    );
  } else if (refs && refs.bibtex) {
    const citation = new Cite(refs.bibtex);
    content = (
      <div>
        {citation.format('bibliography', {
           format: 'text',
           template: 'apa',
        })}
      </div>
    );
  } else {
    content = <p>{title}{year ? `, ${year}` : null}</p>;
  }
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={link}
    >{content}
    </a>
  );
};

export default class DetailsTabLiteratures extends Component {
  constructor(props) {
    super(props);
    this.state = {
      literature: Literature.buildEmpty(),
      literatures: Immutable.List()
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLiteratureAdd = this.handleLiteratureAdd.bind(this);
    this.fetchDOIMetadata = this.fetchDOIMetadata.bind(this);
  }

  componentDidMount() {
    LiteraturesFetcher.fetchElementReferences(this.props.element).then((literatures) => {
      this.setState(prevState => ({ ...prevState, literatures }));
    });
  }

  // shouldComponentUpdate(nextProps, nextState){
  //
  // }


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
  };

  handleLiteratureRemove(literature) {
    const { element, onElementChange } = this.props;
    LiteraturesFetcher.deleteElementReference({ element, literature })
      .then((literatures) => {
        this.setState(prevState => ({ ...prevState, literatures }));
      });
  }

  handleLiteratureAdd(literature) {
    const { element, onElementChange } = this.props;
    const { doi, url, title } = literature;

    LiteraturesFetcher.postElementReference({
      element,
      literature: {
        ...literature,
        doi: sanitizeDoi(doi),
        url: url.trim().replace(/ +/g, ' '),
        title: title.trim().replace(/ +/g, ' ')
      },
    }).then((literatures) => {
      this.setState(() => ({ literature: Literature.buildEmpty(), literatures }));
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

  removeButton(literature) {
    return (
      <Button
        bsSize="small"
        bsStyle="danger"
        onClick={() => this.handleLiteratureRemove(literature)}
      >
        <i className="fa fa-trash-o" />
      </Button>
    );
  }

  literatureRows(literatures) {
    return literatures.map(literature => (
      <tr key={literature.id}>
        <td className="padding-right">
          <Citation literature={literature} />
        </td>
        <td>
          {this.removeButton(literature)}
        </td>
      </tr>
    ));
  }

  render() {
    const { literature, literatures } = this.state;
    return (
      <ListGroup fill>
        <ListGroupItem>
          <Table>
            <thead><tr>
              <th width="90%"></th>
              <th width="10%"></th>
            </tr></thead>
            <tbody>
              {this.literatureRows(literatures)}
            </tbody>
          </Table>
        </ListGroupItem>
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
              <TitleInput handleInputChange={this.handleInputChange} literature={literature} />
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
    );
  }
}

DetailsTabLiteratures.propTypes = {
  element: React.PropTypes.object,
  onElementChange: React.PropTypes.func
}

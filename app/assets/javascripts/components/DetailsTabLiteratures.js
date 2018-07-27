import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  ListGroup,
  ListGroupItem,
  Button,
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
import Sample from './models/Sample';
import Reaction from './models/Reaction';
import ResearchPlan from './models/ResearchPlan';
import Literature from './models/Literature';
import LiteraturesFetcher from './fetchers/LiteraturesFetcher';

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
  }

  handleLiteratureRemove(literature) {
    const { element } = this.props;
    LiteraturesFetcher.deleteElementReference({ element, literature })
      .then((literatures) => {
        this.setState(prevState => ({ ...prevState, literatures }));
      });
  }

  handleLiteratureAdd(literature) {
    const { element } = this.props;
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
  element: PropTypes.oneOfType([
    PropTypes.instanceOf(ResearchPlan),
    PropTypes.instanceOf(Reaction),
    PropTypes.instanceOf(Sample)
  ]).isRequired,
};

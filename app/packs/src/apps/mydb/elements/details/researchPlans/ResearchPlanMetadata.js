import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button, Row, Col
} from 'react-bootstrap';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';

require('@citation-js/plugin-isbn');

export default class ResearchPlanMetadata extends Component {
  constructor(props) {
    super(props);
    this.state = {
      researchPlan: {},
      researchPlanMetadata: {
        title: '',
        subject: '',
        format: '',
        version: '',
        state: '',
        url: '',
        landing_page: '',
        alternate_identifier: [],
        related_identifier: [],
        description: [],
        dates: [],
        geo_location: [],
        funding_reference: []
      }
    };
  }


  componentDidMount() {
    const { parentResearchPlan, parentResearchPlanMetadata } = this.props;
    this.setState({
      researchPlan: parentResearchPlan
    });
    if (parentResearchPlanMetadata) {
      this.setState({
        researchPlanMetadata: parentResearchPlanMetadata
      });
    }
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { parentResearchPlan, parentResearchPlanMetadata } = nextProps;
    this.setState({
      researchPlan: parentResearchPlan,
      researchPlanMetadata: parentResearchPlanMetadata
    });
  }

  handleFieldChange(event) {
    const { researchPlanMetadata } = this.state;

    researchPlanMetadata[event.target.id] = event.target.value;

    this.setState({ researchPlanMetadata });
  }

  saveResearchPlanMetadata() {
    const { researchPlan, researchPlanMetadata } = this.state;

    ResearchPlansFetcher.postResearchPlanMetadata({

      research_plan_id: researchPlan.id,
      title: researchPlanMetadata.title.trim(),
      subject: researchPlanMetadata.subject.trim(),
      alternate_identifier: researchPlanMetadata.alternate_identifier,
      related_identifier: researchPlanMetadata.related_identifier,
      description: researchPlanMetadata.description,

      format: this.format.value.trim(),
      version: this.version.value.trim(),
      geo_location: this.state.researchPlanMetadata.geo_location,
      funding_reference: this.state.researchPlanMetadata.funding_reference,

      url: this.url.value.trim(),
      landing_page: this.landing_page.value.trim()

    }).then((result) => {
      if (result.error) {
        alert(result.error);
      } else if (result.research_plan_metadata) {
        this.setState({
          researchPlanMetadata: result.research_plan_metadata
        });
      }
    });
  }

  updateResearchPlanMetadataDataCiteState(value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata;
      researchPlanMetadata.data_cite_state = value;

      return {
        researchPlanMetadata
      };
    });
  }

  newItemByType(type) {
    switch (type) {
      case 'alternate_identifier':
        return { alternateIdentifier: '', alternateIdentifierType: '' };
      case 'related_identifier':
        return { relatedIdentifier: '', relatedIdentifierType: '' };
      case 'description':
        return { description: '', descriptionType: '' };
      case 'geo_location':
        return { geoLocationPoint: { latitude: '', longitude: '' } };
      case 'funding_reference':
        return { funderName: '', funderIdentifier: '' };
    }
  }

  addResearchPlanMetadataArrayItem(type) {
    this.setState(state => {
      const newItem = this.newItemByType(type);

      const researchPlanMetadata = state.researchPlanMetadata;
      const currentCollection = researchPlanMetadata[type] ? researchPlanMetadata[type] : [];
      const newCollection = currentCollection.concat(newItem);
      researchPlanMetadata[type] = newCollection;

      return researchPlanMetadata;
    });
  }

  removeResearchPlanMetadataArrayItem(type, index) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata;
      const currentCollection = researchPlanMetadata[type] ? researchPlanMetadata[type] : [];
      currentCollection.splice(index, 1);

      researchPlanMetadata[type] = currentCollection;

      return researchPlanMetadata;
    });
  }

  updateResearchPlanMetadataArrayItem(type, index, fieldname, value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata;
      researchPlanMetadata[type][index][fieldname] = value;

      return researchPlanMetadata;
    });
  }

  updateResearchPlanMetadataGeoLocation(index, fieldname, value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata;
      researchPlanMetadata.geo_location[index]['geoLocationPoint'][fieldname] = value;
      return researchPlanMetadata;
    });
  }

  render() {
    const { researchPlanMetadata } = this.state;
    return (
      <div className="border rounded px-3 pt-3 pb-2">
        <Form>
          <Form.Group className="mb-2" controlId="title">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={researchPlanMetadata?.title}
              onChange={event => this.handleFieldChange(event)}
              placeholder="Title"
            />
          </Form.Group>
          <Form.Group className="mb-2" controlId="subject">
            <Form.Label>Subject</Form.Label>
            <Form.Control
              type="text"
              value={researchPlanMetadata?.subject}
              onChange={event => this.handleFieldChange(event)}
              placeholder="Subject"
            />
          </Form.Group>

          <Form.Label>Alternate Identifiers</Form.Label>
          {researchPlanMetadata?.alternate_identifier && researchPlanMetadata?.alternate_identifier.map((alternateIdentifier, index) => (
            <div key={index}>
              <Row>
                <Col sm={5}>
                  <Form.Group className="mb-2">
                    <Form.Label>Alternate Identifier</Form.Label>
                    <Form.Control
                      type="text"
                      value={alternateIdentifier?.alternateIdentifier}
                      placeholder="Alternate Identifier"
                      onChange={(event) => this.updateResearchPlanMetadataArrayItem('alternate_identifier', index, 'alternateIdentifier', event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col sm={5}>
                  <Form.Group className="mb-2">
                    <Form.Label>Type</Form.Label>
                    <Form.Control
                      type="text"
                      value={alternateIdentifier?.alternateIdentifierType}
                      placeholder="Type"
                      onChange={(event) => this.updateResearchPlanMetadataArrayItem('alternate_identifier', index, 'alternateIdentifierType', event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col sm={2} className="d-flex align-items-center">
                  <Form.Label>Action</Form.Label><br />
                  <Button variant="danger" className="ms-auto" size="sm" onClick={() => this.removeResearchPlanMetadataArrayItem('alternate_identifier', index)}>
                    <i className="fa fa-trash-o" />
                  </Button>
                </Col>
              </Row>
            </div>
          ))}
          <Row>
            <Col sm={12} className="d-flex align-items-center">
              <Button className="ms-auto" variant="success" size="sm" onClick={() => this.addResearchPlanMetadataArrayItem('alternate_identifier')}>
                <i className="fa fa-plus" />
              </Button>
            </Col>
          </Row>

          <Form.Label>Related Identifiers</Form.Label>
          {researchPlanMetadata?.related_identifier && researchPlanMetadata?.related_identifier.map((relatedIdentifier, index) => (
            <div key={index}>
              <Row>
                <Col sm={5}>
                  <Form.Group className="mb-2">
                    <Form.Label>Related Identifier</Form.Label>
                    <Form.Control
                      type="text"
                      value={relatedIdentifier?.relatedIdentifier}
                      placeholder="Related Identifier"
                      onChange={(event) => this.updateResearchPlanMetadataArrayItem('related_identifier', index, 'relatedIdentifier', event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col sm={5}>
                  <Form.Group className="mb-2">
                    <Form.Label>Type</Form.Label>
                    <Form.Control
                      type="text"
                      value={relatedIdentifier?.relatedIdentifierType}
                      placeholder="Type"
                      onChange={(event) => this.updateResearchPlanMetadataArrayItem('related_identifier', index, 'relatedIdentifierType', event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col sm={2} className="d-flex align-items-center">
                  <Form.Label>Action</Form.Label><br />
                  <Button variant="danger" className="ms-auto" size="sm" onClick={() => this.removeResearchPlanMetadataArrayItem('related_identifier', index)}>
                    <i className="fa fa-trash-o" />
                  </Button>
                </Col>
              </Row>
            </div>
          ))}
          <Row>
            <Col sm={12} className="d-flex align-items-center">
              <Button className="ms-auto" variant="success" size="sm" onClick={() => this.addResearchPlanMetadataArrayItem('related_identifier')}>
                <i className="fa fa-plus" />
              </Button>
            </Col>
          </Row>

          <Form.Label>Descriptions</Form.Label>
          {researchPlanMetadata?.description && researchPlanMetadata?.description.map((description, index) => (
            <div key={index}>
              <Row>
                <Col sm={5}>
                  <Form.Group className="mb-2">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      type="text"
                      value={description?.description}
                      placeholder="Description"
                      onChange={event => this.updateResearchPlanMetadataArrayItem('description', index, 'description', event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col sm={5}>
                  <Form.Group className="mb-2">
                    <Form.Label>Type</Form.Label>
                    <Form.Control
                      type="text"
                      value={description?.descriptionType}
                      placeholder="Type"
                      onChange={event => this.updateResearchPlanMetadataArrayItem('description', index, 'descriptionType', event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col sm={2} className="d-flex align-items-center">
                  <Form.Label>Action</Form.Label><br />
                  <Button variant="danger" className="ms-auto" size="sm" onClick={() => this.removeResearchPlanMetadataArrayItem('description', index)}>
                    <i className="fa fa-trash-o" />
                  </Button>
                </Col>
              </Row>
            </div>
          ))}
          <Row>
            <Col sm={12} className="d-flex align-items-center">
              <Button className="ms-auto" variant="success" size="sm" onClick={() => this.addResearchPlanMetadataArrayItem('description')}>
                <i className="fa fa-plus" />
              </Button>
            </Col>
          </Row>

          <Form.Group className="mb-2" controlId="metadataFormFormat">
            <Form.Label>Format</Form.Label>
            <Form.Control
              type="text"
              defaultValue={researchPlanMetadata?.format}
              ref={(m) => { this.format = m; }}
              placeholder="Format"
            />
          </Form.Group>
          <Form.Group className="mb-2" controlId="metadataFormVersion">
            <Form.Label>Version</Form.Label>
            <Form.Control
              type="text"
              defaultValue={researchPlanMetadata?.version}
              ref={(m) => { this.version = m; }}
              placeholder="Version"
            />
          </Form.Group>
          <Form.Label>Geolocations</Form.Label>
          <br />
          {researchPlanMetadata?.geo_location && researchPlanMetadata?.geo_location.map((locationItem, index) => (
            <div key={index}>
              <Row>
                <Col sm={5}>
                  <Form.Group className="mb-2">
                    <Form.Label>Longitude</Form.Label>
                    <Form.Control
                      type="text"
                      value={locationItem?.geoLocationPoint?.longitude}
                      placeholder="Longitude e.g. '71.43703438955458'"
                      onChange={event => this.updateResearchPlanMetadataGeoLocation(index, 'longitude', event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col sm={5}>
                  <Form.Group className="mb-2">
                    <Form.Label>Latitude</Form.Label>
                    <Form.Control
                      type="text"
                      value={locationItem?.geoLocationPoint?.latitude}
                      placeholder="Latitude e.g. '-62.85961569975635'"
                      onChange={event => this.updateResearchPlanMetadataGeoLocation(index, 'latitude', event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col sm={2} className="d-flex align-items-center">
                  <Form.Label>Action</Form.Label>
                  <br />
                  <Button variant="danger" className="ms-auto" size="sm" onClick={() => this.removeResearchPlanMetadataArrayItem('geo_location', index)}>
                    <i className="fa fa-trash-o" />
                  </Button>
                </Col>
              </Row>
            </div>
          ))}
          <Row>
            <Col sm={12} className="d-flex align-items-center">
              <Button className="ms-auto" variant="success" size="sm" onClick={() => this.addResearchPlanMetadataArrayItem('geo_location')}>
                <i className="fa fa-plus" />
              </Button>
            </Col>
          </Row>

          <Form.Label>Funding References</Form.Label>
          {researchPlanMetadata?.funding_reference && researchPlanMetadata?.funding_reference.map((fundingReferenceItem, index) => (
            <div key={index}>
              <Row>
                <Col sm={5}>
                  <Form.Group className="mb-2">
                    <Form.Label>Funder Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={fundingReferenceItem?.funderName}
                      placeholder="Funder Name e.g. 'Gordon and Betty Moore Foundation'"
                      onChange={event => this.updateResearchPlanMetadataArrayItem('funding_reference', index, 'funderName', event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col sm={5}>
                  <Form.Group className="mb-2">
                    <Form.Label>Funder Identifier</Form.Label>
                    <Form.Control
                      type="text"
                      value={fundingReferenceItem?.funderIdentifier}
                      placeholder="Funder Identifier e.g. 'https://doi.org/10.13039/100000936'"
                      onChange={event => this.updateResearchPlanMetadataArrayItem('funding_reference', index, 'funderIdentifier', event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col sm={2} className="d-flex align-items-center">
                  <Form.Label>Action</Form.Label>
                  <br />
                  <Button variant="danger" className="ms-auto" size="sm" onClick={() => this.removeResearchPlanMetadataArrayItem('funding_reference', index)}>
                    <i className="fa fa-trash-o" />
                  </Button>
                </Col>
              </Row>
            </div>
          ))}
          <Row>
            <Col sm={12} className="d-flex align-items-center">
              <Button className="ms-auto" variant="success" size="sm" onClick={() => this.addResearchPlanMetadataArrayItem('funding_reference')}>
                <i className="fa fa-plus" />
              </Button>
            </Col>
          </Row>

          <Form.Group className="mb-2" controlId="metadataFormState">
            <Form.Label>State</Form.Label>
            <Form.Select
              value={researchPlanMetadata?.data_cite_state}
              onChange={event => this.updateResearchPlanMetadataDataCiteState(event.target.value)}
              ref={(m) => { this.dataCiteState = m; }}
            >
              <option value="draft">Draft</option>
              <option value="registered">Registered</option>
              <option value="findable">Findable</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2" controlId="metadataFormURL">
            <Form.Label>URL</Form.Label>
            <Form.Control
              type="text"
              defaultValue={researchPlanMetadata?.url}
              ref={(m) => { this.url = m; }}
              placeholder="https://<researchplanmetadata.url>"
            />
          </Form.Group>
          <Form.Group className="mb-2" controlId="metadataFormLandingPage">
            <Form.Label>Landing Page</Form.Label>
            <Form.Control
              type="text"
              defaultValue={researchPlanMetadata?.landing_page}
              ref={(m) => { this.landing_page = m; }}
              placeholder="https://<researchplanmetadata.landing.page>"
            />
          </Form.Group>

          {/* Disabled Attributes, display only */}
          <Form.Group className="mb-2" controlId="metadataFormDOI">
            <Form.Label>DOI</Form.Label>
            <Form.Control
              type="text"
              defaultValue={researchPlanMetadata?.doi}
              placeholder="DOI"
              readOnly
            />
          </Form.Group>
          <Form.Group className="mb-2" controlId="metadataFormPublicationYear">
            <Form.Label>Publication Year</Form.Label>
            <Form.Control
              type="number"
              defaultValue={researchPlanMetadata?.publication_year}
              ref={(m) => { this.publication_year = m; }}
              placeholder="Publication Year"
              readOnly
            />
          </Form.Group>
          {researchPlanMetadata?.dates && <Form.Label>Dates</Form.Label>}
          {researchPlanMetadata?.dates && researchPlanMetadata?.dates.map((dateItem, index) => (
            <div key={index}>
              <Row>
                <Col sm={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>Date</Form.Label>
                    <Form.Control
                      type="text"
                      defaultValue={dateItem.date}
                      placeholder="Date"
                      readOnly
                    />
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>DateType</Form.Label>
                    <Form.Control
                      type="text"
                      defaultValue={dateItem.dateType}
                      placeholder="DateType"
                      readOnly
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          ))}

          <div className="d-flex align-items-center mt-5 mb-0">
          <Button className="ms-auto" variant="success" size="md" onClick={() => this.saveResearchPlanMetadata()}>
            Save Metadata
          </Button>
          </div>
        </Form>
      </div>
    );
  }
}

ResearchPlanMetadata.propTypes = {
  parentResearchPlan: PropTypes.object.isRequired,
  parentResearchPlanMetadata: PropTypes.object
};


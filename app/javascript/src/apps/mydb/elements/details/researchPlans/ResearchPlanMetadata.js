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
    const { researchPlan } = props;
    this.state = this.buildMetadataState(researchPlan.research_plan_metadata || {});
  }

  componentDidUpdate(prevProps) {
    const { researchPlan } = this.props;
    if (researchPlan !== prevProps.researchPlan) {
      this.setState(this.buildMetadataState(researchPlan.research_plan_metadata || {}));
    }
  }

  buildMetadataState(researchPlanMetadata) {
    return {
      researchPlanMetadata: {
        title: researchPlanMetadata.title ?? '',
        subject: researchPlanMetadata.subject ?? '',
        format: researchPlanMetadata.format ?? '',
        version: researchPlanMetadata.version ?? '',
        url: researchPlanMetadata.url ?? '',
        landing_page: researchPlanMetadata.landing_page ?? '',
        alternate_identifier: researchPlanMetadata.alternate_identifier ?? [],
        related_identifier: researchPlanMetadata.related_identifier ?? [],
        description: researchPlanMetadata.description ?? [],
        dates: researchPlanMetadata.dates ?? [],
        geo_location: researchPlanMetadata.geo_location ?? [],
        funding_reference: researchPlanMetadata.funding_reference ?? [],
      }
    }
  }

  handleFieldChange(key, value) {
    const { researchPlanMetadata } = this.state;

    this.setState({
      researchPlanMetadata: {
        ...researchPlanMetadata,
        [key]: value,
      }
    });
  }

  saveResearchPlanMetadata() {
    const { researchPlan } = this.props;
    const { researchPlanMetadata } = this.state;

    ResearchPlansFetcher.postResearchPlanMetadata({
      research_plan_id: researchPlan.id,
      title: researchPlanMetadata.title?.trim(),
      subject: researchPlanMetadata.subject?.trim(),
      alternate_identifier: researchPlanMetadata.alternate_identifier,
      related_identifier: researchPlanMetadata.related_identifier,
      description: researchPlanMetadata.description,

      format: researchPlanMetadata.format?.trim(),
      version: researchPlanMetadata.version?.trim(),
      geo_location: researchPlanMetadata.geo_location,
      funding_reference: researchPlanMetadata.funding_reference,

      url: researchPlanMetadata.url?.trim(),
      landing_page: researchPlanMetadata.landing_page?.trim()
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

      const { researchPlanMetadata } = state;
      const newCollection = [...researchPlanMetadata[type], newItem];

      return {
        ...state, researchPlanMetadata: {
          ...researchPlanMetadata,
          [type]: newCollection,
        }
      };
    });
  }

  removeResearchPlanMetadataArrayItem(type, index) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata;
      const newCollection = [...researchPlanMetadata[type]];
      newCollection.splice(index, 1);
      return {
        ...state, researchPlanMetadata: {
          ...researchPlanMetadata,
          [type]: newCollection,
        }
      };
    });
  }

  updateResearchPlanMetadataArrayItem(type, index, fieldname, value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata;
      researchPlanMetadata[type][index][fieldname] = value;
      return { ...state, researchPlanMetadata };
    });
  }

  updateResearchPlanMetadataGeoLocation(index, fieldname, value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata;
      researchPlanMetadata.geo_location[index]['geoLocationPoint'][fieldname] = value;
      return { ...state, researchPlanMetadata };
    });
  }

  render() {
    const { researchPlanMetadata } = this.state;
    return (
      <div className="px-1 py-2">
        <Form>
          <Form.Group className="mb-2" controlId="title">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={researchPlanMetadata?.title}
              onChange={(e) => this.handleFieldChange('title', e.target.value)}
              placeholder="Title"
            />
          </Form.Group>
          <Form.Group className="mb-2" controlId="subject">
            <Form.Label>Subject</Form.Label>
            <Form.Control
              type="text"
              value={researchPlanMetadata?.subject}
              onChange={(e) => this.handleFieldChange('subject', e.target.value)}
              placeholder="Subject"
            />
          </Form.Group>

          <Form.Label className="my-3">Alternate Identifiers</Form.Label>
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
                  <Form.Label>Action</Form.Label>
                  <br />
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

          <Form.Label className="mb-3">Related Identifiers</Form.Label>
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
              onChange={(e) => this.handleFieldChange('format', e.target.value)}
              placeholder="Format"
            />
          </Form.Group>
          <Form.Group className="mb-2" controlId="metadataFormVersion">
            <Form.Label>Version</Form.Label>
            <Form.Control
              type="text"
              defaultValue={researchPlanMetadata?.version}
              onChange={(e) => this.handleFieldChange('version', e.target.value)}
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
              onChange={(e) => this.handleFieldChange('url', e.target.value)}
              placeholder="https://<researchplanmetadata.url>"
            />
          </Form.Group>
          <Form.Group className="mb-2" controlId="metadataFormLandingPage">
            <Form.Label>Landing Page</Form.Label>
            <Form.Control
              type="text"
              defaultValue={researchPlanMetadata?.landing_page}
              onChange={(e) => this.handleFieldChange('landing_page', e.target.value)}
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
  researchPlan: PropTypes.object.isRequired,
};


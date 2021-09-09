import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Panel,
  ControlLabel,
  Form,
  FormControl,
  FormGroup,
  Button,
  Row,
  Col
} from 'react-bootstrap';
import ResearchPlansFetcher from './fetchers/ResearchPlansFetcher';

require('@citation-js/plugin-isbn');

export default class ResearchPlansMetadata extends Component {
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
        })
      }
    });
  }

  updateResearchPlanMetadataDataCiteState(value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata
      researchPlanMetadata.data_cite_state = value

      return {
        researchPlanMetadata
      }
    })
  }

  newItemByType(type) {
    switch (type) {
      case 'alternate_identifier':
        return { alternateIdentifier: '', alternateIdentifierType: '' }
      case 'related_identifier':
        return { relatedIdentifier: '', relatedIdentifierType: '' }
      case 'description':
        return { description: '', descriptionType: '' }
      case 'geo_location':
        return { geoLocationPoint: { latitude: '', longitude: '' } }
      case 'funding_reference':
        return { funderName: '', funderIdentifier: '' }
    }
  }

  addResearchPlanMetadataArrayItem(type) {
    this.setState(state => {
      const newItem = this.newItemByType(type)

      const researchPlanMetadata = state.researchPlanMetadata
      const currentCollection = researchPlanMetadata[type] ? researchPlanMetadata[type] : []
      const newCollection = currentCollection.concat(newItem)
      researchPlanMetadata[type] = newCollection

      return researchPlanMetadata
    })
  }

  removeResearchPlanMetadataArrayItem(type, index) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata
      const currentCollection = researchPlanMetadata[type] ? researchPlanMetadata[type] : []
      currentCollection.splice(index, 1)

      researchPlanMetadata[type] = currentCollection

      return researchPlanMetadata
    })
  }

  updateResearchPlanMetadataArrayItem(type, index, fieldname, value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata
      researchPlanMetadata[type][index][fieldname] = value

      return researchPlanMetadata
    })
  }

  updateResearchPlanMetadataGeoLocation(index, fieldname, value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata;
      researchPlanMetadata.geo_location[index]['geoLocationPoint'][fieldname] = value;
      return researchPlanMetadata;
    })
  }

  render() {
    const { researchPlanMetadata } = this.state;
    return (
      <Panel>
        <Panel.Body>
          <Form>
            <FormGroup controlId="title">
              <ControlLabel>Title</ControlLabel>&nbsp;&nbsp;
              <FormControl
                type="text"
                value={researchPlanMetadata?.title}
                onChange={event => this.handleFieldChange(event)}
                placeholder="Title"
              />
            </FormGroup>
            <FormGroup controlId="subject">
              <ControlLabel>Subject</ControlLabel>&nbsp;&nbsp;
              <FormControl
                type="text"
                value={researchPlanMetadata?.subject}
                onChange={event => this.handleFieldChange(event)}
                placeholder="Subject"
              />
            </FormGroup>

            <ControlLabel>Alternate Identifiers</ControlLabel>&nbsp;&nbsp;
            {researchPlanMetadata?.alternate_identifier && researchPlanMetadata?.alternate_identifier.map((alternateIdentifier, index) => (
              <div key={index}>
                <Row>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Alternate Identifier</ControlLabel>
                      <FormControl
                        type="text"
                        value={alternateIdentifier?.alternateIdentifier}
                        placeholder="Alternate Identifier"
                        onChange={(event) => this.updateResearchPlanMetadataArrayItem('alternate_identifier', index, 'alternateIdentifier', event.target.value)}
                        />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Type</ControlLabel>
                      <FormControl
                        type="text"
                        value={alternateIdentifier?.alternateIdentifierType}
                        placeholder="Type"
                        onChange={(event) => this.updateResearchPlanMetadataArrayItem('alternate_identifier', index, 'alternateIdentifierType', event.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={2}>
                    <ControlLabel>Action</ControlLabel><br/>
                    <Button bsStyle="danger" className="pull-right" bsSize="small" onClick={() => this.removeResearchPlanMetadataArrayItem('alternate_identifier', index)}>
                      <i className="fa fa-trash-o" />
                    </Button>
                  </Col>
                </Row>
              </div>
            ))}
            <Row>
              <Col smOffset={0} sm={12}>
                <Button className="pull-right" bsStyle="success" bsSize="small" onClick={() => this.addResearchPlanMetadataArrayItem('alternate_identifier')}>
                  <i className="fa fa-plus" />
                </Button>
              </Col>
            </Row>

            <ControlLabel>Related Identifiers</ControlLabel>&nbsp;&nbsp;
            {researchPlanMetadata?.related_identifier && researchPlanMetadata?.related_identifier.map((relatedIdentifier, index) => (
              <div key={index}>
                <Row>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Related Identifier</ControlLabel>
                      <FormControl
                        type="text"
                        value={relatedIdentifier?.relatedIdentifier}
                        placeholder="Related Identifier"
                        onChange={(event) => this.updateResearchPlanMetadataArrayItem('related_identifier', index, 'relatedIdentifier', event.target.value)}
                        />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Type</ControlLabel>
                      <FormControl
                        type="text"
                        value={relatedIdentifier?.relatedIdentifierType}
                        placeholder="Type"
                        onChange={(event) => this.updateResearchPlanMetadataArrayItem('related_identifier', index, 'relatedIdentifierType', event.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={2}>
                    <ControlLabel>Action</ControlLabel><br/>
                    <Button bsStyle="danger" className="pull-right" bsSize="small" onClick={() => this.removeResearchPlanMetadataArrayItem('related_identifier', index)}>
                      <i className="fa fa-trash-o" />
                    </Button>
                  </Col>
                </Row>
              </div>
            ))}
            <Row>
              <Col smOffset={0} sm={12}>
                <Button className="pull-right" bsStyle="success" bsSize="small" onClick={() => this.addResearchPlanMetadataArrayItem('related_identifier')}>
                  <i className="fa fa-plus" />
                </Button>
              </Col>
            </Row>

            <ControlLabel>Descriptions</ControlLabel>&nbsp;&nbsp;
            {researchPlanMetadata?.description && researchPlanMetadata?.description.map((description, index) => (
              <div key={index}>
                <Row>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Description</ControlLabel>
                      <FormControl
                        type="text"
                        value={description?.description}
                        placeholder="Description"
                        onChange={event => this.updateResearchPlanMetadataArrayItem('description', index, 'description', event.target.value)}
                        />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Type</ControlLabel>
                      <FormControl
                        type="text"
                        value={description?.descriptionType}
                        placeholder="Type"
                        onChange={event => this.updateResearchPlanMetadataArrayItem('description', index, 'descriptionType', event.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={2}>
                    <ControlLabel>Action</ControlLabel><br/>
                    <Button bsStyle="danger" className="pull-right" bsSize="small" onClick={() => this.removeResearchPlanMetadataArrayItem('description', index)}>
                      <i className="fa fa-trash-o" />
                    </Button>
                  </Col>
                </Row>
              </div>
            ))}
            <Row>
              <Col smOffset={0} sm={12}>
                <Button className="pull-right" bsStyle="success" bsSize="small" onClick={() => this.addResearchPlanMetadataArrayItem('description')}>
                  <i className="fa fa-plus" />
                </Button>
              </Col>
            </Row>

            <FormGroup controlId="metadataFormFormat">
              <ControlLabel>Format</ControlLabel>
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.format}
                inputRef={(m) => { this.format = m; }}
                placeholder="Format"
              />
            </FormGroup>
            <FormGroup controlId="metadataFormVersion">
              <ControlLabel>Version</ControlLabel>
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.version}
                inputRef={(m) => { this.version = m; }}
                placeholder="Version"
              />
            </FormGroup>
            <ControlLabel style={{ marginTop: 5 }}>Geolocations</ControlLabel><br />
            {researchPlanMetadata?.geo_location && researchPlanMetadata?.geo_location.map((locationItem, index) => (
              <div key={index}>
                <Row>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Longitude</ControlLabel>
                      <FormControl
                        type="text"
                        value={locationItem?.geoLocationPoint?.longitude}
                        placeholder="Longitude e.g. '71.43703438955458'"
                        onChange={event => this.updateResearchPlanMetadataGeoLocation(index, 'longitude', event.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Latitude</ControlLabel>
                      <FormControl
                        type="text"
                        value={locationItem?.geoLocationPoint?.latitude}
                        placeholder="Latitude e.g. '-62.85961569975635'"
                        onChange={event => this.updateResearchPlanMetadataGeoLocation(index, 'latitude', event.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={2}>
                    <ControlLabel>Action</ControlLabel><br/>
                    <Button bsStyle="danger" className="pull-right" bsSize="small" onClick={() => this.removeResearchPlanMetadataArrayItem('geo_location', index)}>
                      <i className="fa fa-trash-o" />
                    </Button>
                  </Col>
                </Row>
              </div>
            ))}
            <Row>
              <Col smOffset={0} sm={12}>
                <Button className="pull-right" bsStyle="success" bsSize="small" onClick={() => this.addResearchPlanMetadataArrayItem('geo_location')}>
                  <i className="fa fa-plus" />
                </Button>
              </Col>
            </Row>

            <ControlLabel style={{ marginTop: 5 }}>Funding References</ControlLabel>
            {researchPlanMetadata?.funding_reference && researchPlanMetadata?.funding_reference.map((fundingReferenceItem, index) => (
              <div key={index}>
                <Row>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Funder Name</ControlLabel>
                      <FormControl
                        type="text"
                        value={fundingReferenceItem?.funderName}
                        placeholder="Funder Name e.g. 'Gordon and Betty Moore Foundation'"
                        onChange={event => this.updateResearchPlanMetadataArrayItem('funding_reference', index, 'funderName', event.target.value)}
                        />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Funder Identifier</ControlLabel>
                      <FormControl
                        type="text"
                        value={fundingReferenceItem?.funderIdentifier}
                        placeholder="Funder Identifier e.g. 'https://doi.org/10.13039/100000936'"
                        onChange={event => this.updateResearchPlanMetadataArrayItem('funding_reference', index, 'funderIdentifier', event.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={2}>
                    <ControlLabel>Action</ControlLabel><br/>
                    <Button bsStyle="danger" className="pull-right" bsSize="small" onClick={() => this.removeResearchPlanMetadataArrayItem('funding_reference', index)}>
                      <i className="fa fa-trash-o" />
                    </Button>
                  </Col>
                </Row>
              </div>
            ))}
            <Row>
              <Col smOffset={0} sm={12}>
                <Button className="pull-right" bsStyle="success" bsSize="small" onClick={() => this.addResearchPlanMetadataArrayItem('funding_reference')}>
                  <i className="fa fa-plus" />
                </Button>
              </Col>
            </Row>

            <FormGroup controlId="metadataFormState">
              <ControlLabel>State</ControlLabel>
              <FormControl
                componentClass="select"
                value={researchPlanMetadata?.data_cite_state}
                onChange={event => this.updateResearchPlanMetadataDataCiteState(event.target.value)}
                inputRef={(m) => { this.dataCiteState = m; }}
              >
                <option value="draft">Draft</option>
                <option value="registered">Registered</option>
                <option value="findable">Findable</option>
              </FormControl>
            </FormGroup>
            <FormGroup controlId="metadataFormURL">
              <ControlLabel>URL</ControlLabel>
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.url}
                inputRef={(m) => { this.url = m; }}
                placeholder="https://<researchplanmetadata.url>"
              />
            </FormGroup>
            <FormGroup controlId="metadataFormLandingPage">
              <ControlLabel>Landing Page</ControlLabel>
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.landing_page}
                inputRef={(m) => { this.landing_page = m; }}
                placeholder="https://<researchplanmetadata.landing.page>"
              />
            </FormGroup>

            {/* Disabled Attributes, display only */}
            <FormGroup controlId="metadataFormDOI">
              <ControlLabel>DOI</ControlLabel>&nbsp;&nbsp;
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.doi}
                placeholder="DOI"
                readOnly
              />
            </FormGroup>
            <FormGroup controlId="metadataFormPublicationYear">
              <ControlLabel>Publication Year</ControlLabel>
              <FormControl
                type="number"
                defaultValue={researchPlanMetadata?.publication_year}
                inputRef={(m) => { this.publication_year = m; }}
                placeholder="Publication Year"
                readOnly
              />
            </FormGroup>
            { researchPlanMetadata?.dates ? <ControlLabel style={{ marginTop: 5 }}>Dates</ControlLabel>: '' }
            { researchPlanMetadata?.dates && researchPlanMetadata?.dates.map((dateItem, index) => (
              <div key={index}>
                <Row>
                  <Col smOffset={0} sm={6}>
                    <FormGroup>
                      <ControlLabel>Date</ControlLabel>
                      <FormControl
                        type="text"
                        defaultValue={dateItem.date}
                        placeholder="Date"
                        readOnly
                        />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={6}>
                    <FormGroup>
                      <ControlLabel>DateType</ControlLabel>
                      <FormControl
                        type="text"
                        defaultValue={dateItem.dateType}
                        placeholder="DateType"
                        readOnly
                      />
                    </FormGroup>
                  </Col>
                </Row>
              </div>
            ))}

            <FormGroup>
              <Button className="pull-right" bsStyle="success" style={{ marginTop: 20 }} onClick={() => this.saveResearchPlanMetadata()}>
                Save Metadata
              </Button>
            </FormGroup>

          </Form>
        </Panel.Body>
      </Panel>
    );
  }
}

ResearchPlansMetadata.propTypes = {
  parentResearchPlan: PropTypes.object.isRequired,
  parentResearchPlanMetadata: PropTypes.object
};


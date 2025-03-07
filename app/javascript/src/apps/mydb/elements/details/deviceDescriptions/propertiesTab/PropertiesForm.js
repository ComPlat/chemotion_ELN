import React, { useContext } from 'react';
import { Form, Row, Col, Accordion } from 'react-bootstrap';
import {
  selectInput, multiSelectInput, textInput, multipleInputGroups,
  textareaInput, dateTimePickerInput, mulipleRowInput, toggleContent,
  checkboxInput, componentInput, identifierMultipleInputGroups,
  inputGroupWithWeightUnit,
} from '../FormFields';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const PropertiesForm = () => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  let deviceDescription = deviceDescriptionsStore.device_description;

  const deviceType = [
    {
      "value": "stand-alone",
      "label": "stand-alone"
    },
    {
      "value": "component",
      "label": "component"
    },
    {
      "value": "equipment",
      "label": "equipment"
    },
    {
      "value": "setup",
      "label": "setup"
    }
  ];

  const deviceTypeDetail = [
    {
      "value": "has variable components",
      "label": "has variable components"
    },
    {
      "value": "no variable components",
      "label": "no variable components"
    }
  ];

  const operationMode = [
    {
      "value": "manual - walk in",
      "label": "manual - walk in"
    },
    {
      "value": "manual - service",
      "label": "manual - service"
    },
    {
      "value": "integrated - automated",
      "label": "integrated - automated"
    }
  ];

  const deviceTags = [
    {
      "value": "manufacturing",
      "label": "manufacturing"
    },
    {
      "value": "processes",
      "label": "processes"
    },
    {
      "value": "sensors",
      "label": "sensors"
    },
    {
      "value": "analysis",
      "label": "analysis"
    },
    {
      "value": "structuring",
      "label": "structuring"
    },
    {
      "value": "others",
      "label": "others"
    },
  ];

  const operatorType = [
    {
      "value": "technical",
      "label": "technical"
    },
    {
      "value": "administrative",
      "label": "administrative"
    }
  ];

  const operatorFields = [
    { value: 'name', label: 'Name', type: 'text' },
    { value: 'phone', label: 'Phone', type: 'text' },
    { value: 'email', label: 'eMail', type: 'text' },
    { value: 'type', label: 'Type', type: 'select', options: operatorType },
    { value: 'comment', label: 'Comment', type: 'text' },
  ];

  const vendorDevice = [
    { value: 'vendor_device_name', label: "Device's name", type: 'text' },
    { value: 'vendor_device_id', label: "Device's ID", type: 'text' },
    { value: 'serial_number', label: 'Serial no', type: 'text' },
  ];
  const vendorDeviceLabel = 'General information on the device from the vendor';

  const vendorCompanyName = [
    { value: 'vendor_company_name', label: "Company's name - brand", type: 'text' },
    { value: 'vendor_id', label: "Vendor's ID", type: 'text' },
  ];
  const vendorCompanyNameLabel = 'Details describing the vendor of the device';

  const versionIdentifierTypes = [
    { value: 'DOI', label: 'DOI', description: '- Digital Object Identifier' },
    { value: 'Handle', label: 'Handle', description: '- CNRI Handle' },
    { value: 'ARK', label: 'ARK', description: '- Archival Resource Key' },
    { value: 'EISSN', label: 'EISSN', description: '- Electronic International Standard Serial Number' },
    { value: 'IGSN', label: 'IGSN', description: '- physical samples and specimens' },
    { value: 'PURL', label: 'PURL', description: '- Persistent Uniform Resource Locator' },
    { value: 'RRID', label: 'RRID', description: '- Research Resource Identifiers' },
  ];

  const versionDoi = [
    { value: 'version_identifier_type', label: 'Type', type: 'select', options: versionIdentifierTypes },
    { value: 'version_doi', label: 'DOI', type: 'text' },
    { value: 'version_doi_url', label: 'DOI-Link', type: 'text' },
  ];
  const versionDoiLabel = 'Persistent identifier';

  const location = [
    { value: 'university_campus', label: 'Institution', type: 'text' },
    { value: 'institute', label: 'Institute', type: 'text' },
    { value: 'building', label: 'Building', type: 'text' },
    { value: 'room', label: 'Room', type: 'text' },
  ];
  const locationLabel = 'Location';

  const accessOptions = [
    { value: 'infrastructure_assignment', label: 'Infrastructure Assignment', type: 'text' },
    { value: 'access_options', label: 'Access options', type: 'text' },
    { value: 'access_comments', label: 'Comments', type: 'text' },
  ];
  const accessOptionsLabel = 'Access options';

  const setupFields = [
    { key: 'vendor_device_id', label: 'No' },
    { key: 'short_label', label: 'Device SL' },
    { key: 'vendor_device_name', label: 'Name' },
    { key: 'url', label: 'ELN Link' },
    { key: 'details', label: 'Details' },
    { key: 'version_doi', label: 'Identifier (DOI)' },
  ];

  const componentFields = [
    { key: 'vendor_device_name', label: 'Component of - setup name' },
    { key: 'vendor_device_id', label: 'Setup ID' },
    { key: 'url', label: 'ELN Link' },
    { key: 'version_doi', label: 'Setup Identifier (DOI)' },
    { key: 'version_doi_url', label: 'Setup Identifier (DOI) link' },
  ];

  const setupDescription = () => {
    const type = deviceDescription.device_type;
    if (!['setup', 'component'].includes(type)) { return ''; }
    const rowFields = type == 'setup' ? setupFields : componentFields;
    const label = type == 'setup' ? 'Component' : 'Setup';

    return (
      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.setup && 'setup'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'setup')}
      >
        <Accordion.Item eventKey="setup">
          <Accordion.Header>
            Setup description
          </Accordion.Header>
          <Accordion.Body>
            {
              componentInput(
                deviceDescription, deviceDescriptionsStore, label,
                'setup_descriptions', type, rowFields, ''
              )
            }
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    );
  }

  return (
    <Form>
      <Row className="mb-4">
        <Col>
          {textInput(deviceDescription, deviceDescriptionsStore, 'name', 'Name')}
        </Col>
      </Row>
      <Row className="mb-4">
        <Col>
          {selectInput(deviceDescription, deviceDescriptionsStore, 'device_type', 'Device type', deviceType)}
        </Col>
        <Col>
          {
            selectInput(
              deviceDescription, deviceDescriptionsStore, 'device_type_detail', 'Device type detail', deviceTypeDetail
            )
          }
        </Col>
        <Col>
          {selectInput(deviceDescription, deviceDescriptionsStore, 'operation_mode', 'Operation mode', operationMode)}
        </Col>
      </Row>

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.general && 'general'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'general')}
      >
        <Accordion.Item eventKey="general">
          <Accordion.Header>
            General description
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-4">
              <Col>
                {multipleInputGroups(deviceDescription, vendorDeviceLabel, vendorDevice, deviceDescriptionsStore)}
              </Col>
            </Row>
            <Row className="mb-4">
              <Col>
                {
                  multipleInputGroups(
                    deviceDescription, vendorCompanyNameLabel, vendorCompanyName, deviceDescriptionsStore
                  )
                }
              </Col>
            </Row>
            <Row className="mb-4">
              <Col>
                {textareaInput(deviceDescription, deviceDescriptionsStore, 'description', 'Description', 3)}
              </Col>
            </Row>
            <Row className="mb-3">
              <Col>
                {multiSelectInput(deviceDescription, deviceDescriptionsStore, 'general_tags', 'Tags', deviceTags)}
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.version_specific && 'version_specific'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'version_specific')}
      >
        <Accordion.Item eventKey="version_specific">
          <Accordion.Header>
            Version specific information
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-4">
              <Col>
                {
                  textInput(
                    deviceDescription, deviceDescriptionsStore, 'version_number',
                    'Version', 'To be extracted from short label (either 1 or 1.1,1.2, 1.3)'
                  )
                }
              </Col>
              <Col>
                {
                  dateTimePickerInput(
                    deviceDescription, deviceDescriptionsStore,
                    'version_installation_start_date', 'Started: Installation date'
                  )
                }
              </Col>
              <Col>
                {
                  dateTimePickerInput(
                    deviceDescription, deviceDescriptionsStore,
                    'version_installation_end_date', 'End date'
                  )
                }
              </Col>
            </Row>
            <Row className="mb-4">
              <Col>
                {
                  identifierMultipleInputGroups(
                    deviceDescription, versionDoiLabel, versionIdentifierTypes, deviceDescriptionsStore
                  )
                }
              </Col>
            </Row>
            <Row className="mb-3">
              <Col>
                {
                  textareaInput(
                    deviceDescription, deviceDescriptionsStore, 'version_characterization',
                    'Characterization of this version', 3, 'Description and comments'
                  )
                }
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.operators_and_locations && 'operators_and_locations'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'operators_and_locations')}
      >
        <Accordion.Item eventKey="operators_and_locations">
          <Accordion.Header>
            Device operators and location
          </Accordion.Header>
          <Accordion.Body>
            <Row>
              <Col>
                {
                  mulipleRowInput(
                    deviceDescription, deviceDescriptionsStore, 'Operators', 'operators', operatorFields, ''
                  )
                }
              </Col>
            </Row>
            <Row className="mb-4">
              <Col>
                {multipleInputGroups(deviceDescription, locationLabel, location, deviceDescriptionsStore)}
              </Col>
            </Row>
            <Row className="mb-3">
              <Col>
                {multipleInputGroups(deviceDescription, accessOptionsLabel, accessOptions, deviceDescriptionsStore)}
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      {setupDescription()}

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.software_interfaces && 'software_interfaces'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'software_interfaces')}
      >
        <Accordion.Item eventKey="software_interfaces">
          <Accordion.Header>
            Software and interfaces
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-3">
              <Col>
                {textInput(deviceDescription, deviceDescriptionsStore, 'application_name', 'Application name')}
              </Col>
              <Col>
                {textInput(deviceDescription, deviceDescriptionsStore, 'application_version', 'Version')}
              </Col>
              <Col>
                {textInput(deviceDescription, deviceDescriptionsStore, 'vendor_url', 'Vendor URL')}
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.manuals && 'manuals'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'manuals')}
      >
        <Accordion.Item eventKey="manuals">
          <Accordion.Header>
            Manuals, documentation and helpers
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-4">
              <Col>
                {
                  checkboxInput(
                    deviceDescription, 'Additional Helpers uploaded to attachments',
                    'helpers_uploaded', deviceDescriptionsStore
                  )
                }
              </Col>
            </Row>
            <Row className="mb-3">
              <Col>
                {
                  textareaInput(
                    deviceDescription, deviceDescriptionsStore, 'policies_and_user_information',
                    'Policies and user information', 3
                  )
                }
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.publications && 'publications'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'publications')}
      >
        <Accordion.Item eventKey="publications">
          <Accordion.Header>
            Information for publications
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-3">
              <Col>
                {
                  textareaInput(
                    deviceDescription, deviceDescriptionsStore, 'description_for_methods_part',
                    'Description for methods part', 3
                  )
                }
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.physical_data && 'physical_data'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'physical_data')}
      >
        <Accordion.Item eventKey="physical_data">
          <Accordion.Header>
            Physical descriptions
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-3">
              <Col>
                {textInput(deviceDescription, deviceDescriptionsStore, 'size', 'Size')}
              </Col>
              <Col>
                {inputGroupWithWeightUnit(
                  deviceDescription, deviceDescriptionsStore,
                  'weight', 'weight_unit', 'Weight', 'Weight in kilogram'
                )}
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Form>
  );
}

export default observer(PropertiesForm);

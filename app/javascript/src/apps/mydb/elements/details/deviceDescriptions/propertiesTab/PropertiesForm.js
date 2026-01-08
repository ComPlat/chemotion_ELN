import React, { useContext } from 'react';
import { Form, Row, Col, Accordion } from 'react-bootstrap';
import {
  selectInput, multiSelectInput, textInput, multipleInputGroups,
  textareaInput, dateTimePickerInput, mulipleRowInput, toggleContent,
  checkboxInput, componentInput, identifierMultipleInputGroups,
  inputGroupWithWeightUnit,
} from '../FormFields';
import { deviceDescriptionSelectOptions } from '../SelectOptions';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const PropertiesForm = () => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  let deviceDescription = deviceDescriptionsStore.device_description;

  const operatorFields = [
    { value: 'name', label: 'Name', type: 'text' },
    { value: 'phone', label: 'Phone', type: 'text' },
    { value: 'email', label: 'eMail', type: 'text' },
    { value: 'type', label: 'Type', type: 'select', options: deviceDescriptionSelectOptions['operator_type'] },
    { value: 'comment', label: 'Comment', type: 'text' },
  ];

  const vendorDevice = [
    { value: 'vendor_device_name', label: 'Model name', type: 'text' },
    { value: 'vendor_device_id', label: 'Model ID', type: 'text' },
    { value: 'serial_number', label: 'Serial no', type: 'text' },
  ];
  const vendorDeviceLabel = 'General information on the device from the manufacturer';

  const vendorCompanyName = [
    { value: 'vendor_company_name', label: 'Manufacturer name', type: 'text' },
    { value: 'vendor_id', label: 'Manufacturer ID', type: 'text' },
    { value: 'vendor_id_type', label: 'ID type', type: 'select', options: deviceDescriptionSelectOptions['vendor_id_type'] },
  ];
  const vendorCompanyNameLabel = 'Details describing the manufacturer of the device';

  const versionDoiLabel = 'Persistent identifier';

  const institutionOwner = [
    { value: 'owner_institution', label: 'Institution', type: 'text' },
    { value: 'owner_email', label: 'eMail', type: 'text' },
    { value: 'owner_id', label: 'ID', type: 'text' },
  ];
  const institutionOwnerLabel = 'Owner';

  const location = [
    { value: 'university_campus', label: 'Institution', type: 'text' },
    { value: 'institute', label: 'Institute', type: 'text' },
    { value: 'building', label: 'Building', type: 'text' },
    { value: 'room', label: 'Room', type: 'text' },
  ];
  const locationLabel = 'Location';

  const inventory = [
    { value: 'inventory_id', label: 'Inventory ID', type: 'text' },
    { value: 'alternative_identifier', label: 'Alternative Identifier / Label', type: 'text' },
  ];
  const inventoryLabel = '';

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
          {
            selectInput(
              deviceDescription, deviceDescriptionsStore, 'device_class', 'Device class',
              deviceDescriptionSelectOptions['device_class']
            )
          }
        </Col>
        <Col>
          {
            selectInput(
              deviceDescription, deviceDescriptionsStore, 'device_class_detail', 'Device class detail',
              deviceDescriptionSelectOptions['device_class_detail']
            )
          }
        </Col>
        <Col>
          {
            selectInput(
              deviceDescription, deviceDescriptionsStore, 'operation_mode', 'Operation mode',
              deviceDescriptionSelectOptions['operation_mode']
            )
          }
        </Col>
        <Col>
          {
            selectInput(
              deviceDescription, deviceDescriptionsStore, 'device_type', 'Device type',
              deviceDescriptionSelectOptions['device_type']
            )
          }
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
                {
                  multiSelectInput(
                    deviceDescription, deviceDescriptionsStore, 'general_tags', 'Tags',
                    deviceDescriptionSelectOptions['device_tags']
                  )
                }
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
                    deviceDescription, versionDoiLabel, deviceDescriptionSelectOptions['version_identifier_types'],
                    deviceDescriptionsStore
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
                {multipleInputGroups(deviceDescription, institutionOwnerLabel, institutionOwner, deviceDescriptionsStore)}
              </Col>
            </Row>
            <Row className="mb-4">
              <Col>
                {multipleInputGroups(deviceDescription, locationLabel, location, deviceDescriptionsStore)}
              </Col>
            </Row>
            <Row className="mb-4">
              <Col>
                {multipleInputGroups(deviceDescription, inventoryLabel, inventory, deviceDescriptionsStore)}
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

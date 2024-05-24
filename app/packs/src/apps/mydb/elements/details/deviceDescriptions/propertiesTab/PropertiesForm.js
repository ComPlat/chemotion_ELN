import React, { useContext } from 'react';
import { Collapse } from 'react-bootstrap';
import {
  selectInput, multiSelectInput, textInput, multipleInputGroups,
  textareaInput, dateTimePickerInput, headlineWithToggle,
  operatorInput, ontologiesList, checkboxInput, componentInput,
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

  const operator_type = [
    {
      "value": "technical",
      "label": "technical"
    },
    {
      "value": "administrative",
      "label": "administrative"
    }
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
    { value: 'university_campus', label: 'University - Campus', type: 'text' },
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
    { key: 'version_doi', label: 'DOI' },
  ];

  const componentFields = [
    { key: 'vendor_device_name', label: 'Component of - setup name' },
    { key: 'vendor_device_id', label: 'Setup ID' },
    { key: 'version_doi', label: 'Setup DOI' },
    { key: 'version_doi_url', label: 'Setup DOI link' },
  ];

  const setupDescription = () => {
    const type = deviceDescription.device_type;
    if (!['setup', 'component'].includes(type)) { return ''; }
    const rowFields = type == 'setup' ? setupFields : componentFields;
    const label = type == 'setup' ? 'Setup' : 'Component';

    return (
      <>
        {headlineWithToggle(deviceDescriptionsStore, 'setup', 'Setup description')}
        <Collapse in={deviceDescriptionsStore.toggable_contents.setup} className="grouped-fields-row cols-1" >
          <div>
            {
              componentInput(
                deviceDescription, deviceDescriptionsStore, label,
                'setup_descriptions', type, rowFields, ''
              )
            }
          </div>
        </Collapse>
      </>
    );
  }

  return (
    <div className="form-fields">
      <div className="grouped-fields-row cols-3">
        {textInput(deviceDescription, deviceDescriptionsStore, 'name', 'Name')}
      </div>
      <div className="grouped-fields-row cols-3">
        {selectInput(deviceDescription, deviceDescriptionsStore, 'device_type', 'Device type', deviceType)}
        {
          selectInput(
            deviceDescription, deviceDescriptionsStore, 'device_type_detail',
            'Device type detail', deviceTypeDetail
          )
        }
        {selectInput(deviceDescription, deviceDescriptionsStore, 'operation_mode', 'Operation mode', operationMode)}
      </div>

      {headlineWithToggle(deviceDescriptionsStore, 'general', 'General description')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.general} className="grouped-fields-row cols-1">
        <div>
          {multipleInputGroups(deviceDescription, vendorDeviceLabel, vendorDevice, deviceDescriptionsStore)}
          {multipleInputGroups(deviceDescription, vendorCompanyNameLabel, vendorCompanyName, deviceDescriptionsStore)}
          {textareaInput(deviceDescription, deviceDescriptionsStore, 'description', 'Description', 3)}
          {multiSelectInput(deviceDescription, deviceDescriptionsStore, 'general_tags', 'Tags', deviceTags)}
        </div>
      </Collapse>

      {headlineWithToggle(deviceDescriptionsStore, 'version_specific', 'Version specific information')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.version_specific}>
        <div>
          <div className="grouped-fields-row cols-3">
            {
              textInput(
                deviceDescription, deviceDescriptionsStore, 'version_number',
                'Version', 'To be extracted from short label (either 1 or 1.1,1.2, 1.3)'
              )
            }
            {
              dateTimePickerInput(
                deviceDescription, deviceDescriptionsStore,
                'version_installation_start_date', 'Started: Installation Date'
              )
            }
            {
              dateTimePickerInput(
                deviceDescription, deviceDescriptionsStore,
                'version_installation_end_date', 'End Date'
              )
            }
          </div>
          <div className="grouped-fields-row cols-1">
            {multipleInputGroups(deviceDescription, versionDoiLabel, versionDoi, deviceDescriptionsStore)}
            <div className="form-group">
              Previous versions of this device
            </div>
            <div className="form-group">
              Later versions of this device
            </div>
            {
              textareaInput(
                deviceDescription, deviceDescriptionsStore, 'version_characterization',
                'Characterization of this version', 3, 'Description and comments'
              )
            }
          </div>
        </div>
      </Collapse>

      {headlineWithToggle(deviceDescriptionsStore, 'operators_and_locations', 'Device operators and location')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.operators_and_locations} className="grouped-fields-row cols-1">
        <div>
          {operatorInput(deviceDescription, deviceDescriptionsStore, 'Operators')}
          {multipleInputGroups(deviceDescription, locationLabel, location, deviceDescriptionsStore)}
          {multipleInputGroups(deviceDescription, accessOptionsLabel, accessOptions, deviceDescriptionsStore)}
        </div>
      </Collapse>

      {headlineWithToggle(deviceDescriptionsStore, 'software_interfaces', 'Software and interfaces')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.software_interfaces} className="grouped-fields-row cols-3">
        <div>
          {textInput(deviceDescription, deviceDescriptionsStore, 'application_name', 'Application Name')}
          {textInput(deviceDescription, deviceDescriptionsStore, 'application_version', 'Version')}
          {textInput(deviceDescription, deviceDescriptionsStore, 'vendor_url', 'Vendor URL')}
        </div>
      </Collapse>

      {headlineWithToggle(deviceDescriptionsStore, 'manuals', 'Manuals, documentation and helpers')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.manuals} className="grouped-fields-row cols-1">
        <div>
          {
            checkboxInput(
              deviceDescription, 'Additional Helpers uploaded to attachments',
              'helpers_uploaded', deviceDescriptionsStore
            )
          }
          {
            textareaInput(
              deviceDescription, deviceDescriptionsStore, 'policies_and_user_information',
              'Policies and User Information', 3
            )
          }
        </div>
      </Collapse>

      {headlineWithToggle(deviceDescriptionsStore, 'publications', 'Information for Publications')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.publications} className="grouped-fields-row cols-1">
        <div>
          {
            textareaInput(
              deviceDescription, deviceDescriptionsStore, 'description_for_methods_part',
              'Description for methods part', 3
            )
          }
        </div>
      </Collapse>

      {setupDescription()}

      {headlineWithToggle(deviceDescriptionsStore, 'physical_data', 'Physical data, media and hardware requirements')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.physical_data} className="grouped-fields-row cols-2">
        <div>
          {textInput(deviceDescription, deviceDescriptionsStore, 'size', 'Size')}
          {textInput(deviceDescription, deviceDescriptionsStore, 'weight', 'Weight [kg]', 'Weight in kilogram')}
        </div>
      </Collapse>
    </div>
  );
}

export default observer(PropertiesForm);

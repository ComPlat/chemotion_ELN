import React, { useEffect, useContext } from 'react';
import { FormControl, FormGroup, ControlLabel, Form, Button } from 'react-bootstrap';
import Select from 'react-select3';
import { formatDate } from 'src/utilities/timezoneHelper';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DeviceMetadataTab = () => {
  const devicesStore = useContext(StoreContext).devices;
  const deviceMetadataStore = useContext(StoreContext).deviceMetadata;
  const device = devicesStore.device;
  const deviceMetadata = deviceMetadataStore.device_metadata;

  useEffect(() => {
    deviceMetadataStore.changeDeviceMetadata('device_id', device.id);
  }, []);

  const dataCiteStateOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'registered', label: 'Registered' },
    { value: 'findable', label: 'Findable' },
  ];

  if (!deviceMetadata.data_cite_state) {
    deviceMetadataStore.changeDeviceMetadata('data_cite_state', 'draft');
  }
  const dataCiteStateValue = dataCiteStateOptions.filter(f => f.value == deviceMetadata.data_cite_state);

  const onChange = (field, value) => {
    let newValue = '';
    if (value) {
      newValue = field == 'data_cite_state' ? value.value : value;
    }
    deviceMetadataStore.changeDeviceMetadata(field, newValue);
  }

  const addDeviceMetadataDate = () => {
    const newDateItem = { date: '', dateType: '' };
    const currentDates = deviceMetadata.dates ? deviceMetadata.dates : [];
    const newDates = currentDates.concat(newDateItem);
    deviceMetadataStore.changeDeviceMetadata('dates', newDates);
  }

  const updateDeviceMetadataDate = (index, field, value) => {
    deviceMetadataStore.changeDeviceMetadataDate(index, field, value);
  }

  const removeDeviceMetadataDate = (index) => {
    const currentDates = deviceMetadata.dates ? [...deviceMetadata.dates] : [];
    currentDates.splice(index, 1);
    deviceMetadataStore.changeDeviceMetadata('dates', currentDates);
  }

  const syncDeviceMetadataFromDataCite = () => {
    if (!deviceMetadata.doi) {
      deviceMetadataStore.changeErrorMessage('Metadata DOI: Can not be blank');
    } else {
      deviceMetadataStore.changeErrorMessage('');
    }
    if (deviceMetadataStore.error_message == '') {
      const params = {
        doi: deviceMetadata.doi.trim(),
        device_id: deviceMetadata.device_id,
      }
      deviceMetadataStore.updateDeviceMetadata(params);
    } 
  }

  const syncDeviceMetadataToDataCite = () => {
    deviceMetadataStore.syncDeviceMetadataToDataCite({ device_id: device.id });
  }

  const deviceMetaDataDates = () => {
    if (!deviceMetadata.dates) { return null; }

    let dateForms = [];
    deviceMetadata.dates.map((dateItem, index) => {
      dateForms.push(
        <div className="form-with-columns col-full" key={`group-div-${index}`}>
          <FormGroup className="col-half">
            <ControlLabel key={`date-label-${index}`}>Date</ControlLabel>
            <FormControl
              type="text"
              value={dateItem.date}
              placeholder="Date e.g. '2020-01-01'"
              onChange={event => updateDeviceMetadataDate(index, 'date', event.target.value)}
            />
          </FormGroup>
          <FormGroup className="col-middle">
            <ControlLabel>Date Type</ControlLabel>
            <FormControl
              type="text"
              value={dateItem.dateType}
              placeholder="DateType e.g. 'Created'"
              onChange={event => updateDeviceMetadataDate(index, 'dateType', event.target.value)}
            />
          </FormGroup>
          <FormGroup className="col-small">
            <ControlLabel>Action</ControlLabel>
            <Button bsStyle="danger" bsSize="small"
              className="pull-right"
              onClick={() => removeDeviceMetadataDate(index)}
            >
              <i className="fa fa-trash-o" />
            </Button>
          </FormGroup>
        </div>
      );
    });

    return dateForms;
  }

  const syncToDataCiteButton = () => {
    if (deviceMetadata.id && deviceMetadata.doi) { return null }

    return (
      <Button className="pull-right with-margin-bottom col-half"
        bsStyle="danger"
        onClick={() => syncDeviceMetadataFromDataCite()}
      >
        Sync from DataCite
      </Button>
    );
  }

  const getFromDataCiteHeadline = () => {
    return deviceMetadata.id && deviceMetadata.doi ? null : <h4 className="col-full">Get Metadata from DataCite</h4>;
  }

  const createDeviceMetadataHeadline = () => {
    return deviceMetadata.id && deviceMetadata.doi ? null : <h4 className="clear-after-button col-full">Or create Metadata and sync to DataCite</h4>;
  }

  const dataCiteUpdatedAt = () => {
    if (!deviceMetadata.data_cite_updated_at) { return ''; }

    return formatDate(deviceMetadata.data_cite_updated_at);
  }

  return (
    <Form className="form-with-columns">
      {getFromDataCiteHeadline()}
      <FormGroup className="col-half">
        <ControlLabel>DOI *</ControlLabel>
        <FormControl
          type="text"
          value={deviceMetadata.doi ? deviceMetadata.doi : ''}
          onChange={(event) => onChange('doi', event.target.value)}
          placeholder="10.*****/**********"
          readOnly={deviceMetadata.id && deviceMetadata.doi ? true : false}
        />
      </FormGroup>
      {syncToDataCiteButton()}
      {createDeviceMetadataHeadline()}

      <FormGroup className="col-full">
        <ControlLabel>State *</ControlLabel>
        <Select
          value={dataCiteStateValue}
          options={dataCiteStateOptions}
          onChange={(event) => onChange('data_cite_state', event)}
        />
      </FormGroup>

      <FormGroup className="col-half">
        <ControlLabel>URL *</ControlLabel>
        <FormControl
          type="text"
          value={deviceMetadata.url ? deviceMetadata.url : ''}
          placeholder="https://<device.url>"
          onChange={(event) => onChange('url', event.target.value)}
        />
      </FormGroup>

      <FormGroup className="col-half">
        <ControlLabel>Landing Page *</ControlLabel>
        <FormControl
          type="text"
          value={deviceMetadata.landing_page ? deviceMetadata.landing_page : ''}
          placeholder="https://<device.landing.page>"
          onChange={(event) => onChange('landing_page', event.target.value)}
        />
      </FormGroup>

      <FormGroup className="col-half">
        <ControlLabel>Name *</ControlLabel>
        <FormControl
          type="text"
          value={deviceMetadata.name ? deviceMetadata.name : ''}
          placeholder="Name"
          onChange={(event) => onChange('name', event.target.value)}
        />
      </FormGroup>

      <FormGroup className="col-half">
        <ControlLabel>Publication Year *</ControlLabel>
        <FormControl
          type="number"
          value={deviceMetadata.publication_year ? deviceMetadata.publication_year : ''}
          placeholder="Publication Year e.g. '2020'"
          onChange={(event) => onChange('publication_year', event.target.value)}
        />
      </FormGroup>

      <FormGroup className="col-full">
        <ControlLabel>Description</ControlLabel>
        <FormControl
          type="text"
          value={deviceMetadata.description ? deviceMetadata.description : ''}
          placeholder="Description"
          onChange={(event) => onChange('description', event.target.value)}
        />
      </FormGroup>

      <FormGroup className="col-full">
        <ControlLabel>Dates</ControlLabel>
      </FormGroup>
      {deviceMetaDataDates()}

      <FormGroup className="col-full">
        <Button bsStyle="success" bsSize="small" className="pull-right" onClick={() => addDeviceMetadataDate()}>
          <i className="fa fa-plus" />
        </Button>
      </FormGroup>

      <hr className="col-full" />

      <FormGroup className="col-half">
        DataCiteVersion: {deviceMetadata.data_cite_version}<br />
        DataCiteUpdatedAt: {dataCiteUpdatedAt()}
      </FormGroup>

      <Button className="pull-right col-half" bsStyle="danger" onClick={() => syncDeviceMetadataToDataCite()}>
        Sync to DataCite
      </Button>
    </Form>
  );
}

export default observer(DeviceMetadataTab);

import React, { useEffect, useContext } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useIntl, FormattedMessage } from 'react-intl';
import { Select } from 'src/components/common/Select';
import { formatDate } from 'src/utilities/timezoneHelper';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function DeviceMetadataTab() {
  const intl = useIntl();
  const devicesStore = useContext(StoreContext).devices;
  const deviceMetadataStore = useContext(StoreContext).deviceMetadata;
  const { device } = devicesStore;
  const deviceMetadata = deviceMetadataStore.device_metadata;

  useEffect(() => {
    if (!deviceMetadata.device_id) {
      deviceMetadataStore.changeDeviceMetadata('device_id', device.id);
    }
  }, []);

  const dataCiteStateOptions = [
    { value: 'draft', label: intl.formatMessage({ id: 'devices-metadata_state_draft' }) },
    { value: 'registered', label: intl.formatMessage({ id: 'devices-metadata_state_registered' }) },
    { value: 'findable', label: intl.formatMessage({ id: 'devices-metadata_state_findable' }) },
  ];

  if (!deviceMetadata.data_cite_state) {
    deviceMetadataStore.changeDeviceMetadata('data_cite_state', 'draft');
  }
  const dataCiteStateValue = dataCiteStateOptions.filter((f) => f.value == deviceMetadata.data_cite_state);

  const onChange = (field, value) => {
    let newValue = '';
    if (value) {
      newValue = field == 'data_cite_state' ? value.value : value;
    }
    deviceMetadataStore.changeDeviceMetadata(field, newValue);
  };

  const addDeviceMetadataDate = () => {
    const newDateItem = { date: '', dateType: '' };
    const currentDates = deviceMetadata.dates ? deviceMetadata.dates : [];
    const newDates = currentDates.concat(newDateItem);
    deviceMetadataStore.changeDeviceMetadata('dates', newDates);
  };

  const updateDeviceMetadataDate = (index, field, value) => {
    deviceMetadataStore.changeDeviceMetadataDate(index, field, value);
  };

  const removeDeviceMetadataDate = (index) => {
    const currentDates = deviceMetadata.dates ? [...deviceMetadata.dates] : [];
    currentDates.splice(index, 1);
    deviceMetadataStore.changeDeviceMetadata('dates', currentDates);
  };

  const syncDeviceMetadataFromDataCite = () => {
    if (!deviceMetadata.doi) {
      deviceMetadataStore.changeErrorMessage(intl.formatMessage({ id: 'devices-metadata_doi_blank_error' }));
    } else {
      deviceMetadataStore.changeErrorMessage('');
    }
    if (deviceMetadataStore.error_message == '') {
      const params = {
        doi: deviceMetadata.doi.trim(),
        device_id: deviceMetadata.device_id,
      };
      deviceMetadataStore.updateDeviceMetadata(params);
    }
  };

  const syncDeviceMetadataToDataCite = () => {
    deviceMetadataStore.syncDeviceMetadataToDataCite({ device_id: device.id });
  };

  const deviceMetaDataDates = () => {
    if (!deviceMetadata.dates) { return null; }

    const dateForms = [];
    deviceMetadata.dates.map((dateItem, index) => {
      dateForms.push(
        <div className="d-flex justify-content-between flex-wrap w-100" key={`group-div-${index}`}>
          <Form.Group className="col-6 pe-4">
            <Form.Label key={`date-label-${index}`}><FormattedMessage id="devices-metadata_date" /></Form.Label>
            <Form.Control
              type="text"
              value={dateItem.date}
              placeholder={intl.formatMessage({ id: 'devices-metadata_date_placeholder' })}
              onChange={(event) => updateDeviceMetadataDate(index, 'date', event.target.value)}
            />
          </Form.Group>
          <Form.Group className="col-5">
            <Form.Label><FormattedMessage id="devices-metadata_date_type" /></Form.Label>
            <Form.Control
              type="text"
              value={dateItem.dateType}
              placeholder={intl.formatMessage({ id: 'devices-metadata_date_type_placeholder' })}
              onChange={(event) => updateDeviceMetadataDate(index, 'dateType', event.target.value)}
            />
          </Form.Group>
          <Form.Group className="col align-self-center">
            <Form.Label className="w-100 text-end"><FormattedMessage id="devices-metadata_action" /></Form.Label>
            <Button
              variant="danger"
              size="sm"
              className="float-end"
              onClick={() => removeDeviceMetadataDate(index)}
            >
              <i className="fa fa-trash-o" />
            </Button>
          </Form.Group>
        </div>
      );
    });

    return dateForms;
  };

  const syncToDataCiteButton = () => {
    if (deviceMetadata.id && deviceMetadata.doi) { return null; }

    return (
      <Button
        className="w-50 mb-4 align-self-end form-control"
        variant="danger"
        onClick={() => syncDeviceMetadataFromDataCite()}
      >
        <FormattedMessage id="devices-metadata_sync_from_datacite" />
      </Button>
    );
  };

  const getFromDataCiteHeadline = () => (deviceMetadata.id && deviceMetadata.doi
    ? null : <h4 className="w-100"><FormattedMessage id="devices-metadata_get_from_datacite" /></h4>);

  const createDeviceMetadataHeadline = () => (deviceMetadata.id && deviceMetadata.doi
    ? null : <h4 className="w-100"><FormattedMessage id="devices-metadata_create_headline" /></h4>);

  const dataCiteUpdatedAt = () => {
    if (!deviceMetadata.data_cite_updated_at) { return ''; }

    return formatDate(deviceMetadata.data_cite_updated_at);
  };

  return (
    <Form className="d-flex justify-content-between flex-wrap">
      {getFromDataCiteHeadline()}
      <Form.Group className="w-50 mb-4 pe-4">
        <Form.Label>
          <FormattedMessage id="devices-metadata_doi" />
          {' '}
          *
        </Form.Label>
        <Form.Control
          type="text"
          value={deviceMetadata.doi ? deviceMetadata.doi : ''}
          onChange={(event) => onChange('doi', event.target.value)}
          placeholder="10.*****/**********"
          readOnly={!!(deviceMetadata.id && deviceMetadata.doi)}
        />
      </Form.Group>
      {syncToDataCiteButton()}
      {createDeviceMetadataHeadline()}

      <Form.Group className="w-100 mb-4">
        <Form.Label><FormattedMessage id="devices-metadata_state" /></Form.Label>
        <Select
          value={dataCiteStateValue}
          options={dataCiteStateOptions}
          onChange={(event) => onChange('data_cite_state', event)}
        />
      </Form.Group>

      <Form.Group className="w-50 mb-4 pe-4">
        <Form.Label>
          <FormattedMessage id="devices-metadata_url" />
          {' '}
          *
        </Form.Label>
        <Form.Control
          type="text"
          value={deviceMetadata.url ? deviceMetadata.url : ''}
          placeholder="https://<device.url>"
          onChange={(event) => onChange('url', event.target.value)}
        />
      </Form.Group>

      <Form.Group className="w-50 mb-4">
        <Form.Label><FormattedMessage id="devices-metadata_landing_page" /></Form.Label>
        <Form.Control
          type="text"
          value={deviceMetadata.landing_page ? deviceMetadata.landing_page : ''}
          placeholder="https://<device.landing.page>"
          onChange={(event) => onChange('landing_page', event.target.value)}
        />
      </Form.Group>

      <Form.Group className="w-50 mb-4 pe-4">
        <Form.Label><FormattedMessage id="name" /></Form.Label>
        <Form.Control
          type="text"
          value={deviceMetadata.name ? deviceMetadata.name : ''}
          placeholder={intl.formatMessage({ id: 'name' })}
          onChange={(event) => onChange('name', event.target.value)}
        />
      </Form.Group>

      <Form.Group className="w-50 mb-4">
        <Form.Label>
          <FormattedMessage id="devices-metadata_publication_year" />
          {' '}
          *
        </Form.Label>
        <Form.Control
          type="number"
          value={deviceMetadata.publication_year ? deviceMetadata.publication_year : ''}
          placeholder={intl.formatMessage({ id: 'devices-metadata_publication_year_placeholder' })}
          onChange={(event) => onChange('publication_year', event.target.value)}
        />
      </Form.Group>

      <Form.Group className="w-100 mb-4">
        <Form.Label><FormattedMessage id="devices-metadata_description" /></Form.Label>
        <Form.Control
          type="text"
          value={deviceMetadata.description ? deviceMetadata.description : ''}
          placeholder={intl.formatMessage({ id: 'devices-metadata_description' })}
          onChange={(event) => onChange('description', event.target.value)}
        />
      </Form.Group>

      <Form.Group className="w-100 mb-2">
        <Form.Label><FormattedMessage id="devices-metadata_dates" /></Form.Label>
      </Form.Group>
      {deviceMetaDataDates()}

      <Form.Group className="w-100 mb-4 mt-2">
        <Button variant="success" size="sm" className="float-end" onClick={() => addDeviceMetadataDate()}>
          <i className="fa fa-plus" />
        </Button>
      </Form.Group>

      <hr className="w-100 mb-4" />

      <Form.Group className="w-50 pe-4">
        <FormattedMessage id="devices-metadata_data_cite_version" />
        :
        {' '}
        {deviceMetadata.data_cite_version}
        <br />
        <FormattedMessage id="devices-metadata_data_cite_updated_at" />
        :
        {' '}
        {dataCiteUpdatedAt()}
      </Form.Group>

      <Button className="w-50 form-control" variant="danger" onClick={() => syncDeviceMetadataToDataCite()}>
        <FormattedMessage id="devices-metadata_sync_to_datacite" />
      </Button>
    </Form>
  );
}

export default observer(DeviceMetadataTab);

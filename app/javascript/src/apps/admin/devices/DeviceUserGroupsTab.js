import React, { useContext } from 'react';
import { Form } from 'react-bootstrap';
import { useIntl, FormattedMessage } from 'react-intl';
import { AsyncSelect } from 'src/components/common/Select';
import { selectUserOptionFormater, selectedUserFormater } from 'src/utilities/selectHelper';

import AdminFetcher from 'src/fetchers/AdminFetcher';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function DeviceUserGroupsTab() {
  const intl = useIntl();
  const devicesStore = useContext(StoreContext).devices;
  const { device } = devicesStore;

  const toggleLoading = (value) => {
    devicesStore.setIsLoading(value);
  };

  const handleUser = (value, type) => {
    devicesStore.changeDevice(type, value);
  };

  const loadUserByName = (input, type) => {
    if (!input) {
      return Promise.resolve([]);
    }

    return AdminFetcher.fetchUsersByNameType(input, type)
      .then((result) => selectUserOptionFormater({ data: result, withType: false })).catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  return (
    <Form>
      <Form.Group className="mb-4">
        <Form.Label><FormattedMessage id="devices-add_permission_users" /></Form.Label>
        <AsyncSelect
          isMulti
          isClearable={false}
          isLoading={devicesStore.is_loading}
          loadOptions={(input) => loadUserByName(input, 'Person')}
          loadingMessage={() => intl.formatMessage({ id: 'type_to_search' })}
          value={selectedUserFormater(device.people)}
          placeholder={intl.formatMessage({ id: 'select_placeholder' })}
          onChange={(value) => handleUser(value, 'people')}
          onMenuOpen={() => toggleLoading(true)}
          onMenuClose={() => toggleLoading(false)}
        />
      </Form.Group>
      <Form.Group className="mb-4">
        <Form.Label><FormattedMessage id="devices-add_permission_groups" /></Form.Label>
        <AsyncSelect
          isMulti
          isClearable={false}
          isLoading={devicesStore.is_loading}
          loadOptions={(input) => loadUserByName(input, 'Group')}
          loadingMessage={() => intl.formatMessage({ id: 'type_to_search' })}
          value={selectedUserFormater(device.groups)}
          placeholder={intl.formatMessage({ id: 'select_placeholder' })}
          onChange={(value) => handleUser(value, 'groups')}
          onMenuOpen={() => toggleLoading(true)}
          onMenuClose={() => toggleLoading(false)}
        />
      </Form.Group>
    </Form>
  );
}

export default observer(DeviceUserGroupsTab);

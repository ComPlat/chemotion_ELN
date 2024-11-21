import React, { useContext } from 'react';
import { Form } from 'react-bootstrap';
import { AsyncSelect } from 'src/components/common/Select';
import { selectUserOptionFormater, selectedUserFormater } from 'src/utilities/selectHelper';

import AdminFetcher from 'src/fetchers/AdminFetcher';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DeviceUserGroupsTab = () => {
  const devicesStore = useContext(StoreContext).devices;
  let device = devicesStore.device;

  const toggleLoading = (value) => {
    devicesStore.setIsLoading(value);
  }

  const handleUser = (value, type) => {
    devicesStore.changeDevice(type, value);
  }

  const loadUserByName = (input, type) => {
    if (!input) {
      return Promise.resolve([]);
    }

    return AdminFetcher.fetchUsersByNameType(input, type)
      .then((result) => {
        return selectUserOptionFormater({ data: result, withType: false })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  return (
    <Form>
      <Form.Group className="mb-4">
        <Form.Label>Add device permission to users</Form.Label>
        <AsyncSelect
          isMulti
          isClearable={false}
          isLoading={devicesStore.is_loading}
          loadOptions={(input) => loadUserByName(input, 'Person')}
          loadingMessage={() => "Type to search"}
          value={selectedUserFormater(device.people)}
          placeholder="Select ..."
          onChange={(value) => handleUser(value, 'people')}
          onMenuOpen={() => toggleLoading(true)}
          onMenuClose={() => toggleLoading(false)}
        />
      </Form.Group>
      <Form.Group className="mb-4">
        <Form.Label>Add device permission to groups</Form.Label>
        <AsyncSelect
          isMulti
          isClearable={false}
          isLoading={devicesStore.is_loading}
          loadOptions={(input) => loadUserByName(input, 'Group')}
          loadingMessage={() => "Type to search"}
          value={selectedUserFormater(device.groups)}
          placeholder="Select ..."
          onChange={(value) => handleUser(value, 'groups')}
          onMenuOpen={() => toggleLoading(true)}
          onMenuClose={() => toggleLoading(false)}
        />
      </Form.Group>
    </Form>
  );
}

export default observer(DeviceUserGroupsTab);

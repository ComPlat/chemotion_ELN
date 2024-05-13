import React, { useContext } from 'react';
import { FormGroup, ControlLabel, Form } from 'react-bootstrap';
import AsyncSelect from 'react-select3/async';
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
    let newValue = value ? value : [];
    devicesStore.changeDevice(type, newValue);
  }

  const loadUserByName = (input, type) => {
    if (!input) {
      return Promise.resolve([]);
    }

    return AdminFetcher.fetchUsersByNameType(input, type)
      .then((result) => {
        return selectUserOptionFormater({ data: result, withType: false }).options
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  return (
    <Form>
      <FormGroup>
        <ControlLabel>Add device permission to users</ControlLabel>
        <AsyncSelect
          isMulti
          isClearable={false}
          isLoading={devicesStore.is_loading}
          loadOptions={(input) => loadUserByName(input, 'Person')}
          loadingMessage={() => "Type to search"}
          value={selectedUserFormater(device.people).options}
          placeholder="Select ..."
          onChange={(value) => handleUser(value, 'people')}
          onMenuOpen={() => toggleLoading(true)}
          onMenuClose={() => toggleLoading(false)}
          className="device-multi-select"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Add device permission to groups</ControlLabel>
        <AsyncSelect
          isMulti
          isClearable={false}
          isLoading={devicesStore.is_loading}
          loadOptions={(input) => loadUserByName(input, 'Group')}
          loadingMessage={() => "Type to search"}
          value={selectedUserFormater(device.groups).options}
          placeholder="Select ..."
          onChange={(value) => handleUser(value, 'groups')}
          onMenuOpen={() => toggleLoading(true)}
          onMenuClose={() => toggleLoading(false)}
          className="device-multi-select"
        />
      </FormGroup>
    </Form>
  );
}

export default observer(DeviceUserGroupsTab);

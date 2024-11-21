// Format data for react-select component when using with users data as returned by the API
// input: { users: [{ id: 1, name: 'John Doe', initials: 'JD', type: 'Person' }, ...]}
// output: [{ value: 1, label: 'John Doe (JD - Person)' }, ...]

const buildLabel = (user, withType = false) => (
  withType ? `${user.name} (${user.initials} - ${user.type})` : `${user.name} (${user.initials})`
);

const filterById = (list, currentUserId = null) => {
  if (!currentUserId) { return list }
  return list.filter((item) => item.id !== currentUserId);
}

const selectUserOptionFormater = ({ data = {}, withType = false, currentUserId = null }) => {
  const users = filterById(data.users || [], currentUserId);
  return users.map((user) => ({
    id: user.id,
    value: user.id,
    name: user.name,
    initials: user.initials,
    label: buildLabel(user, withType),
  }));
};

const selectedUserFormater = (users) => {
  return users.map((user) => ({
    id: user.id,
    value: user.id,
    initials: user.initials,
    name: user.name,
    label: buildLabel(user, false),
  }));
}

const selectDeviceOptionFormater = ({ data = {}, currentDeviceId = null }) => {
  const devices = filterById(data.devices || [], currentDeviceId);
  return devices.map((device) => ({
    value: device.id,
    name: device.name,
    label: `${device.name} (${device.initials})`,
  }));
};

export {
  selectUserOptionFormater,
  selectDeviceOptionFormater,
  selectedUserFormater
};

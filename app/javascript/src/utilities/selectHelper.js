// Format data for react-select component when using with users data as returned by the API
// input: { users: [{ id: 1, name: 'John Doe', initials: 'JD', type: 'Person' }, ...]}
// output: { options: [{ value: 1, label: 'John Doe (JD - Person)' }, ...]}

const buildLabel = (user, withType = false) => (
  withType ? `${user.name} (${user.initials} - ${user.type})` : `${user.name} (${user.initials})`
);

const filterCurrentUser = (data, currentUserId = null) => {
  const { users } = data;
  if (!currentUserId) { return users || []; }
  return (users || []).filter((user) => user.id !== currentUserId);
};

const selectUserOptionFormater = ({ data = {}, withType = false, currentUserId = null }) => {
  const users = filterCurrentUser(data, currentUserId);
  const usersEntries = (users).map((user) => ({
    id: user.id,
    value: user.id,
    name: user.name,
    initials: user.initials,
    label: buildLabel(user, withType),
  }));
  return { options: usersEntries };
};

const selectedUserFormater = (users) => {
  if (users.length < 1) { return { options: [] }; }

  const usersEntries = (users).map((user) => ({
    id: user.id,
    value: user.id,
    initials: user.initials,
    name: user.name,
    label: buildLabel(user, false),
  }));
  return { options: usersEntries };
}

const filterCurrentDevice = (data, currentDeviceId = null) => {
  const { devices } = data;
  if (!currentDeviceId) { return devices || []; }
  return (devices || []).filter((device) => device.id !== currentDeviceId);
};

const selectDeviceOptionFormater = ({ data = {}, withType = false, currentDeviceId = null }) => {
  const devices = filterCurrentDevice(data, currentDeviceId);
  const deviceEntries = (devices).map((device) => ({
    value: device.id,
    name: device.name,
    label: `${device.name} (${device.initials})`,
  }));
  return { options: deviceEntries };
};

export {
  selectUserOptionFormater, selectDeviceOptionFormater, selectedUserFormater
};

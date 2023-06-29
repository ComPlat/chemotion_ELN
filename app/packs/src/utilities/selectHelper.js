// Format data for react-select component when using with users data as returned by the API
// { users: [{ id: 1, name: 'John Doe', initials: 'JD', type: 'Person' }, ...]}

const filterLabel = (user, withType = false) => (
  withType ? `${user.name} (${user.initials} - ${user.type})` : `${user.name} (${user.initials})`
);

const filterData = (data, currentUserId = null) => {
  const { users } = data;
  if (!currentUserId) { return users || []; }
  return (users || []).filter((user) => user.id !== currentUserId);
};

const selectUserOptionFormater = ({ data = {}, withType = false, currentUserId = null }) => {
  const users = filterData(data, currentUserId);
  const usersEntries = (users).map((user) => ({
    value: user.id,
    name: user.name,
    label: filterLabel(user, withType),
  }));
  return { options: usersEntries };
};

export {
  selectUserOptionFormater
};

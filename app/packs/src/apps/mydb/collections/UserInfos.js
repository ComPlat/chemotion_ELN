import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'react-bootstrap';
import UserInfoIcon from 'src/apps/mydb/collections/UserInfoIcon';

const UserInfos = ({ users }) => {
  const userTooltips = users.map((user) => {
    return (
      <div key={user.id}>
        <UserInfoIcon type={user.type} />
        {user.name}
      </div>
    );
  });

  return (
    <Tooltip id="tooltip">
      {userTooltips}
    </Tooltip>
  );
};

UserInfos.propTypes = {
  users: PropTypes.array.isRequired,
};

export default UserInfos;

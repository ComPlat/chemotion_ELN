import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'react-bootstrap';
import UserInfoIcon from 'src/apps/mydb/collections/UserInfoIcon';

const UserInfosTooltip = forwardRef(({ users, ...tooltipProps }, ref) => (
  <Tooltip ref={ref} id="tooltip" {...tooltipProps}>
    {users.map((user) => (
      <div key={user.id} className="d-flex align-items-baseline gap-1">
        <UserInfoIcon type={user.type} />
        {user.name}
      </div>
    ))}
  </Tooltip>
));

UserInfosTooltip.propTypes = {
  users: PropTypes.array.isRequired,
};

export default UserInfosTooltip;

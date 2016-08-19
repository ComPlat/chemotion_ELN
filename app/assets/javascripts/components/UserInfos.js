import React from 'react';
import {Tooltip} from 'react-bootstrap';
import UserInfoIcon from './UserInfoIcon';

const UserInfos = ({users}) => {
  let tipUsers = users.map((user,ind)=>{
    return <div key={ind}><UserInfoIcon type={user.type}/> {user.name}<br/></div>
  })
  return(
    <Tooltip id="tooltip">
      {tipUsers.map(u=>u)}
    </Tooltip>
  )
}

UserInfos.propTypes = {
  users: React.PropTypes.array.isRequired,
}

export default UserInfos;

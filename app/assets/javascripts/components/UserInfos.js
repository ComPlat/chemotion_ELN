import React from 'react';
import {Tooltip} from 'react-bootstrap';


const UserInfos = ({users}) => {
  let tipUsers = users.map((user,ind)=>{
    return <div key={ind}><i className={userIconClass(user.type)} aria-hidden="true"/>{user.name}<br/></div>
  })
  return(
    <Tooltip id="tooltip">
      {tipUsers.map(u=>u)}
    </Tooltip>
  )
}

const userIconClass = (type) =>{
  switch(type) {
    case 'Person':
      return "fa fa-user"
    case 'Group':
      return "fa fa-users"
    default:
      return  "fa fa-question"
  }
}

UserInfos.propTypes = {
  users: React.PropTypes.array.isRequired,
}

export default UserInfos;

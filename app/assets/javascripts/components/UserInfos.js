import React from 'react';
import {Tooltip} from 'react-bootstrap';


const UserInfos = ({users}) => {
  let iconClass =  "fa fa-user"
  let tipUsers = users.map((user,ind)=>{
    switch(user.type) {
      case 'Person':
        iconClass = "fa fa-user"
        break;
      case 'Group':
        iconClass = "fa fa-users"
        break;
      default:
        iconClass =  "fa fa-user"
    }
    return <div key={ind}><i className={iconClass} aria-hidden="true"/>{user.name}<br/></div>
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

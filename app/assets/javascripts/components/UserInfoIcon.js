import React from 'react';

const UserInfoIcon = ({type}) =>{
  switch(type) {
    case 'Person':
      return <i className="fa fa-user" aria-hidden="true"/>
    case 'Group':
      return <i className="fa fa-users" aria-hidden="true"/>
    default:
      return  <i className="fa fa-question" aria-hidden="true"/>
  }
}

UserInfoIcon.propTypes = {
  type: React.PropTypes.string.isRequired,
}

export default UserInfoIcon;

import React from 'react';
import PropTypes from 'prop-types';

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
  type: PropTypes.string.isRequired,
}

export default UserInfoIcon;

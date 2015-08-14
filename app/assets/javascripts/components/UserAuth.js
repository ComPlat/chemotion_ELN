import React, {Component} from 'react';
import 'whatwg-fetch';
import cookie from 'react-cookie';

export default class UserAuth extends Component {
  constructor(props) {
    super(props);
  }

  logout() {
    fetch('/users/sign_out.json', {method: 'delete'})
      .then(response => {
        if (response.status == 204) {
          cookie.remove('_chemotion_session');
          window.location = '/users/sign_in';
        }
      });
  }

  render() {
    let {currentUser} = this.props;
    return (
      <div>
        <p className='navbar-text'>
          {`Logged in as ${currentUser}.`}
        </p>
        <a onClick={() => this.logout()} className='btn btn-primary navbar-btn'>Logout</a>
      </div>
    );
  }
}

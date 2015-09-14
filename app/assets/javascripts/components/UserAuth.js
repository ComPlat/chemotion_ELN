import React, {Component} from 'react';
import 'whatwg-fetch';

import UserActions from './actions/UserActions';
import UserStore from './stores/UserStore';
import Functions from './utils/Functions';

export default class UserAuth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: props.currentUser || {name: 'unkown'}
    }
  }

  componentDidMount() {
    UserStore.listen(this.onChange.bind(this));
    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.setState({
      currentUser: state.currentUser
    });
  }
 
  logout(){
    $.ajax({
      method: "DELETE",
      url: "/users/sign_out.json",
      data: {
        authenticity_token: Functions.getMetaContent("csrf-token")
      }
    }).done(function(){
      location.reload();
    });
    UserActions.logout();
  }

  render() {
    return (
      <span>
        <p className='navbar-text'>
          {`Logged in as ${this.state.currentUser.name}.`}
        </p>
        <a onClick={() => this.logout()} className='btn btn-primary navbar-btn'>Logout</a>
      </span>
    );
  }
}

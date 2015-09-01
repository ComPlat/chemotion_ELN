import React, {Component} from 'react';
import 'whatwg-fetch';

import UserActions from './actions/UserActions';
import UserStore from './stores/UserStore';

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

  render() {
    return (
      <span>
        <p className='navbar-text'>
          {`Logged in as ${this.state.currentUser.name}.`}
        </p>
        <a onClick={() => UserActions.logout()} className='btn btn-primary navbar-btn'>Logout</a>
      </span>
    );
  }
}

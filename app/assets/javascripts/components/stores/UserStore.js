import alt from '../alt';
import _ from 'lodash';

import UserActions from '../actions/UserActions';

import UIStore from './UIStore';
import ElementStore from './ElementStore';

class UserStore {
  constructor() {
    this.state = {
      users: [],
      currentUser: null,
      profile: null,
      currentTab: 0,
      currentType: ""
    };

    this.bindListeners({
      handleFetchUsers: UserActions.fetchUsers,
      handleFetchCurrentUser: UserActions.fetchCurrentUser,
      handleFetchProfile: UserActions.fetchProfile,
      handleChangeLayout: UserActions.changeLayout,
      handleSelectTab: UserActions.selectTab,
      handleUpdateShowSampleExt: UserActions.updateShowSampleExt
    })
  }

  handleFetchUsers(result) {
    this.state.users = result;
  }

  handleFetchCurrentUser(result) {
    this.state.currentUser = result

    let layout = this.state.currentUser.layout
    if (this.state.currentType == "") {
      let currentTab = this.state.currentTab
      let type = Object.keys(layout).filter(function(e) {
        return layout[e] == currentTab + 1
      })[0]

      this.state.currentType = type
    }
  }

  handleFetchProfile(result) {
    this.state.profile = result;
  }

  handleChangeLayout(result) {
    this.waitFor(ElementStore.dispatchToken)
    this.state.currentUser.layout = result
  }

  handleUpdateShowSampleExt(result) {
    if (this.state.profile && result >= 0) {
      this.state.profile.show_external_name = result
    }
  }

  handleSelectTab(tab) {
    let layout = this.state.currentUser.layout
    let type = Object.keys(layout).filter(function(e) {
      return layout[e] == tab + 1
    })[0]

    this.state.currentTab = tab
    this.state.currentType = type
  }
}

export default alt.createStore(UserStore, 'UserStore');

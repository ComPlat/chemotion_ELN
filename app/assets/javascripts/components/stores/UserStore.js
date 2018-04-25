import alt from '../alt';
import _ from 'lodash';

import UserActions from '../actions/UserActions';

import UIStore from './UIStore';
import ElementStore from './ElementStore';

class UserStore {
  constructor() {
    this.state = {
      currentUser: null,
      profile: null,
      currentTab: 0,
      currentType: '',
      devices: [],
    };

    this.bindListeners({
      handleFetchCurrentUser: UserActions.fetchCurrentUser,
      handleFetchProfile: UserActions.fetchProfile,
      handleChangeLayout: UserActions.changeLayout,
      handleSelectTab: UserActions.selectTab,
      handleUpdateUserProfile: UserActions.updateUserProfile,
      handleFetchNoVNCDevices: UserActions.fetchNoVNCDevices,
    })
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

  handleUpdateUserProfile(result) {
    if (this.state.profile && result) {
      this.state.profile = result
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
  handleFetchNoVNCDevices(devices) {
    if (devices) { this.state.devices = devices; }
  }
}

export default alt.createStore(UserStore, 'UserStore');

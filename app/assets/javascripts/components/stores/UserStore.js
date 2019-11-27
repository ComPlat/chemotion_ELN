import alt from '../alt';
import _ from 'lodash';
import UserActions from '../actions/UserActions';

class UserStore {
  constructor() {
    this.state = {
      currentUser: null,
      profile: null,
      // TODO: currentTab and currentType should be in UIStore
      currentTab: 0,
      currentType: '',
      devices: [],
      rxnos: [],
      chmos: [],
      labels: [],
      genericEls: []
    };

    this.bindListeners({
      handleFetchOlsRxno: UserActions.fetchOlsRxno,
      handleFetchOlsChmo: UserActions.fetchOlsChmo,
      handleFetchGenericEls: UserActions.fetchGenericEls,
      handleFetchCurrentUser: UserActions.fetchCurrentUser,
      handleFetchUserLabels: UserActions.fetchUserLabels,
      handleFetchProfile: UserActions.fetchProfile,
      handleSelectTab: UserActions.selectTab,
      handleUpdateUserProfile: UserActions.updateUserProfile,
      handleFetchNoVNCDevices: UserActions.fetchNoVNCDevices,
    });
  }

  handleFetchUserLabels(result) {
    this.state.labels = result.labels;
  }

  handleFetchOlsRxno(result) {
    this.state.rxnos = result.ols_terms;
  }

  handleFetchOlsChmo(result) {
    this.state.chmos = result.ols_terms;
  }

  handleFetchGenericEls(result) {
    this.state.genericEls = result.klass;
  }

  handleFetchCurrentUser(result) {
    this.state.currentUser = result
  }

  handleFetchProfile(result) {
    this.state.profile = result;
    const { layout } = this.state.profile.data;
    if (this.state.currentType === '') {
      const { currentTab } = this.state
      const type = Object.keys(layout).filter((e) => {
        return layout[e] === currentTab + 1
      })[0]
      this.state.currentType = type
    }
  }

  handleUpdateUserProfile(result) {
    if (this.state.profile && result) {
      this.state.profile = result
    }
  }

  handleSelectTab(tab) {
    const { layout } = this.state.profile.data;
    const type = Object.keys(layout).filter((e) => {
      return layout[e] === tab + 1
    })[0]

    this.state.currentTab = tab
    this.state.currentType = type
  }

  handleFetchNoVNCDevices(devices) {
    if (devices) { this.state.devices = devices; }
  }
}

export default alt.createStore(UserStore, 'UserStore');

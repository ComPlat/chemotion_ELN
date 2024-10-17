import alt from 'src/stores/alt/alt';
import UserActions from 'src/stores/alt/actions/UserActions';

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
      genericEls: [],
      segmentKlasses: [],
      dsKlasses: [],
      unitsSystem: {},
      matriceConfigs: [],
      omniauthProviders: [],
      bao: []
    };

    this.bindListeners({
      handleFetchOlsRxno: UserActions.fetchOlsRxno,
      handleFetchOlsChmo: UserActions.fetchOlsChmo,
      handleFetchOlsBao: UserActions.fetchOlsBao,
      handleFetchGenericEls: UserActions.fetchGenericEls,
      handleFetchCurrentUser: UserActions.fetchCurrentUser,
      handleFetchUserLabels: UserActions.fetchUserLabels,
      handleFetchProfile: UserActions.fetchProfile,
      handleFetchEditors: UserActions.fetchEditors,
      handleSelectTab: UserActions.selectTab,
      handleUpdateUserProfile: UserActions.updateUserProfile,
      handleFetchNoVNCDevices: UserActions.fetchNoVNCDevices,
      handleSegementKlasses: UserActions.fetchSegmentKlasses,
      handleDatasetKlasses: UserActions.fetchDatasetKlasses,
      handleUnitsSystem: UserActions.fetchUnitsSystem,
      handleOmniauthProviders: UserActions.fetchOmniauthProviders
    });
  }

  handleFetchUserLabels(result) {
    this.state.labels = result.labels;
  }

  handleFetchEditors(result) {
    this.state.matriceConfigs = result.matrices;
  }

  handleFetchOlsBao(result) {
    this.state.bao = result.ols_terms;
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
    this.state.currentUser = result;
  }

  handleFetchProfile(result) {
    // DEFAULT_KETCHER2: disable to remove default ketcher2
    // result.data.default_structure_editor = "ketcher2"
    this.state.profile = result;
    const { layout } = this.state.profile.data;
    if (this.state.currentType === '') {
      const { currentTab } = this.state;
      const type = Object.keys(layout).filter((e) => {
        return layout[e] === currentTab + 1;
      })[0];
      this.state.currentType = type;
    }
  }

  handleUpdateUserProfile(result) {
    if (this.state.profile && result) {
      this.state.profile = result;
    }
  }

  handleSelectTab(tab) {
    const { layout } = this.state.profile.data;
    const type = Object.keys(layout).filter((e) => {
      return layout[e] === tab + 1;
    })[0];

    this.state.currentTab = tab;
    this.state.currentType = type;
  }

  handleFetchNoVNCDevices(devices) {
    if (devices) { this.state.devices = devices; }
  }

  handleSegementKlasses(result) {
    this.state.segmentKlasses = result.klass;
  }

  handleDatasetKlasses(result) {
    this.state.dsKlasses = result.klass;
  }

  handleUnitsSystem(result) {
    this.state.unitsSystem = result;
  }

  handleOmniauthProviders(result) {
    this.state.omniauthProviders = result.omniauth_providers;
    this.state.extraRules = result.extra_rules;
  }
}

export default alt.createStore(UserStore, 'UserStore');

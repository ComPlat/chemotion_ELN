import { flow, types } from 'mobx-state-tree';
import { values } from 'mobx';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import GenericDSsFetcher from 'src/fetchers/GenericDSsFetcher';
import GenericSgsFetcher from 'src/fetchers/GenericSgsFetcher';
import UserLabelsFetcher from 'src/fetchers/UserLabelsFetcher';
import ApiClient from 'src/api_clients/ChemotionApiClient';
import MatrixCheck from 'src/components/common/MatrixCheck';

// adapted from Entities::UserEntity
const User = types.model(
  'User',
  {
    id: types.identifierNumber,
    name: types.optional(types.string, ''),
    first_name: types.optional(types.string, ''),
    last_name: types.optional(types.string, ''),
    initials: types.optional(types.string, ''),
    used_space: types.optional(types.integer, 0),
    allocated_space: types.optional(types.integer, 0),
    samples_count: types.optional(types.integer, 0),
    reactions_count: types.optional(types.integer, 0),
    cell_lines_count: types.optional(types.integer, 0),
    device_descriptions_count: types.optional(types.integer, 0),
    vessels_count: types.optional(types.integer, 0),
    sequence_based_macromolecule_samples_count: types.optional(types.integer, 0),
    type: types.maybeNull(types.string),
    reaction_name_prefix: types.optional(types.string, ''),
    // layout: types.???, // this column appears to be orphaned and moved to profile, just without deleting the field in the users table
    email: types.optional(types.string, ''),
    unconfirmed_email: types.maybeNull(types.string),
    is_templates_moderator: types.optional(types.boolean, false),
    molecule_editor: types.optional(types.boolean, false),
    converter_admin: types.optional(types.boolean, false),
    account_active: types.optional(types.boolean, false),
    matrix: types.optional(types.integer, 0),
    counters: types.map(types.union(types.integer, types.string)),
    generic_admin: types.map(types.boolean),
    otp_required_for_login: types.optional(types.boolean, false),
    profile: types.frozen({}) // hack to create a structure for something without authoritative data structure
  }
);
const Device = types.model(
  'Device',
  {
    id: types.identifier,
    name: types.string,
    target: types.string,
    password: types.string
  }
);

const RxnoItem = types.model(
  'RxnoItem',
  {
    id: types.optional(types.integer, 0),
    is_enabled: types.optional(types.boolean, true),
    search: types.string,
    synonym: types.maybeNull(types.string),
    synonyms: types.maybeNull(types.array(types.maybeNull(types.string))),
    term_id: types.maybeNull(types.string),
    title: types.string,
    value: types.string,
    children: types.array(types.late(() => RxnoItem))
  }
);
const RxnoRecentlySelectedHeader = types.model(
  'RxnoRecentlySelectedHeader',
  {
    title: types.string,
    value: types.string,
    selectable: types.boolean,
    children: types.array(RxnoItem)
  }
);
const RxnoOrHeader = types.union(
  {
    dispatcher: (snapshot) => {
      if (snapshot.selectable !== undefined) {
        return RxnoRecentlySelectedHeader;
      }
      return RxnoItem;
    }
  },
  RxnoRecentlySelectedHeader,
  RxnoItem
);

const ChmoItem = types.model(
  'ChmoItem',
  {
    id: types.optional(types.integer, 0),
    is_enabled: types.optional(types.boolean, true),
    search: types.string,
    synonym: types.maybeNull(types.string),
    synonyms: types.maybeNull(types.array(types.string)),
    term_id: types.maybeNull(types.string),
    title: types.string,
    value: types.string,
    children: types.array(types.late(() => ChmoItem))
  }
);
const ChmoRecentlySelectedHeader = types.model(
  'ChmoRecentlySelectedHeader',
  {
    title: types.string,
    value: types.string,
    selectable: types.boolean,
    children: types.array(ChmoItem)
  }
);
const ChmoOrHeader = types.union(
  {
    dispatcher: (snapshot) => {
      if (snapshot.selectable !== undefined) {
        return ChmoRecentlySelectedHeader;
      }
      return ChmoItem;
    }
  },
  ChmoItem,
  ChmoRecentlySelectedHeader
);

const BaoItem = types.model(
  'BaoItem',
  {
    id: types.string,
    term_id: types.maybeNull(types.string),
    synonym: types.maybeNull(types.string),
    synonyms: types.maybeNull(types.array(types.string)),
    search: types.string,
    title: types.string,
    is_enabled: types.boolean,
    children: types.array(types.late(() => BaoItem))
  }
);
const BaoRecentlySelectedHeader = types.model(
  'BaoRecentlySelectedHeader',
  {
    title: types.string,
    value: types.string,
    selectable: types.boolean,
    children: types.array(BaoItem)
  }
);
const BaoOrHeader = types.union(
  {
    dispatcher: (snapshot) => {
      if (snapshot.selectable !== undefined) {
        return BaoRecentlySelectedHeader;
      }
      return BaoItem;
    }
  },
  BaoItem,
  BaoRecentlySelectedHeader
);

const Label = types.model(
  'Label',
  {
    id: types.identifierNumber,
    user_id: types.maybeNull(types.integer), // must be adapted when switching to uuids eventually
    access_level: types.integer,
    title: types.string,
    description: types.optional(types.string, ''),
    color: types.string
  }
);
const UnitSystemField = types.model(
  'UnitSystemField',
  {
    type: types.string,
    field: types.string,
    label: types.string,
    default: types.string,
    position: types.integer,
    placeholder: types.string,
    units: types.array(types.model(
      'Unit',
      {
        key: types.string,
        label: types.string,
        nm: types.optional(types.union(types.float, types.integer), 1.0),
        unit_type: types.maybeNull(types.string)
      }
    ))
  }
);
const UnitSystem = types.model(
  'UnitSystem',
  {
    fields: types.array(UnitSystemField)
  }
);
const MatrixConfiguration = types.model(
  'MatrixConfiguration',
  {
    id: types.identifierNumber,
    enabled: types.boolean,
    name: types.string,
    label: types.string,
    configs: types.frozen({}),
    include_ids: types.array(types.integer),
    include_users: types.array(types.model(
      'IncludeUserConfiguration',
      {
        value: types.integer,
        name: types.string,
        label: types.string
      }
    )),
    exclude_ids: types.array(types.integer),
    exclude_users: types.array(types.model(
      'ExcludeUserConfiguration',
      {
        value: types.integer,
        name: types.string,
        label: types.string
      }
    )),
  }
);

const OmniauthProvider = types.model(
  'OmniauthProvider',
  {
    icon: types.string,
    label: types.string
  }
);
const ExtraRule = types.model(
  'ExtraRule',
  {
    disable_db_login: types.optional(types.boolean, false),
    disable_signup: types.optional(types.boolean, false)
  }
);

const UserStore = types.model(
  'UserStore',
  {
    authToken: types.maybeNull(types.string, localStorage.getItem('chemotion-auth-token')),
    role: types.optional(types.string, localStorage.getItem('chemotion-role') || 'Guest'),
    currentUser: types.maybeNull(User),
    profile: types.optional(types.frozen({}), {}), // must be serialized later, currently the full datastructure is unknown to me
    currentTab: types.optional(types.integer, 0),
    currentType: types.optional(types.string, ''),
    devices: types.array(Device),
    rxnos: types.array(RxnoOrHeader),
    chmos: types.array(ChmoOrHeader),
    labels: types.array(Label),
    genericEls: types.array(types.frozen({})), // must be serialized later, currently the full datastructure is unknown to me
    segmentKlasses: types.array(types.frozen({})), // must be serialized later, currently the full datastructure is unknown to me,
    dsKlasses: types.array(types.frozen({})), // must be serialized later, currently the full datastructure is unknown to me,
    unitsSystem: types.optional(UnitSystem, { fields: [] }),
    matriceConfigs: types.array(MatrixConfiguration),
    omniauthProviders: types.map(OmniauthProvider),
    extraRules: types.optional(ExtraRule, {}),
    bao: types.array(BaoOrHeader),
  }
).actions((self) => ({
  fetchCurrentUser: flow(function* fetchCurrentUser() {
    const result = yield UsersFetcher.fetchCurrentUser();
    self.currentUser = User.create(result.user);
  }),
  fetchProfile: flow(function* fetchProfile() {
    const result = yield UsersFetcher.fetchProfile();
    self.profile = result;
    if (self.currentType === '') {
      const { layout } = self.profile.data;
      const typeFromProfile = Object.keys(layout).filter((e) => layout[e] === self.currentTab + 1)[0];
      self.currentType = typeFromProfile;
    }
  }),
  updateUserProfile: flow(function* updateUserProfile(params = {}) {
    const result = yield UsersFetcher.updateUserProfile(params);
    self.profile = result;
  }),
  selectTab: (tab) => {
    const { layout } = self.profile.data;
    const typeFromProfile = Object.keys(layout).filter((e) => layout[e] === tab + 1)[0];
    self.currentTab = tab;
    self.currentType = typeFromProfile;
  },
  fetchNoVNCDevices: flow(function* fetchNoVNCDevices() {
    const result = yield UsersFetcher.fetchNoVNCDevices();
    self.devices = result.map((device) => Device.create(device));
    return self.devices;
  }),

  fetchOlsRxno: flow(function* fetchOlsRxno() {
    const result = yield UsersFetcher.fetchOls('rxno');
    self.rxnos = result.ols_terms.map((item) => RxnoOrHeader.create(item));
  }),
  fetchOlsChmo: flow(function* fetchOlsChmo() {
    const result = yield UsersFetcher.fetchOls('chmo');
    self.chmos = result.ols_terms.map((item) => ChmoOrHeader.create(item));
  }),
  fetchOlsBao: flow(function* fetchOlsBao() {
    const result = yield UsersFetcher.fetchOls('bao');
    self.bao = result.ols_terms.map((item) => BaoOrHeader.create(item));
  }),
  fetchUserLabels: flow(function* fetchUserLabels() {
    const result = yield UserLabelsFetcher.listUserLabels(true);
    self.labels = result.labels.map((label) => Label.create(label));
  }),
  fetchGenericEls: flow(function* fetchCurrentUser() {
    const result = yield UsersFetcher.fetchElementKlasses();
    self.genericEls = result.klass;
  }),
  fetchSegmentKlasses: flow(function * fetchSegmentKlasses() {
    const result = yield GenericSgsFetcher.listSegmentKlass();
    self.segmentKlasses = result.klass;
  }),
  fetchDatasetKlasses: flow(function* fetchDatasetKlasses() {
    const result = yield GenericDSsFetcher.fetchKlass();
    self.dsKlasses = result.klass;
  }),
  fetchUnitsSystem: flow(function* fetchUnitsSystem() {
    const result = yield ApiClient.getJson(
      '/units_system/units_system.json',
      { cache: 'no-store', headers: { 'cache-control': 'no-cache' } }
    );
    self.unitsSystem = UnitSystem.create(result);
  }),
  fetchEditors: flow(function* fetchEditors() {
    const result = yield UsersFetcher.listEditors();
    self.matriceConfigs = result.matrices.map((entry) => MatrixConfiguration.create(entry));
  }),
  fetchOmniauthProviders: flow(function* fetchOmniauthProviders() {
    const result = yield UsersFetcher.fetchOmniauthProviders();
    self.omniauthProviders = result.omniauth_providers.map((provider) => OmniauthProvider.create(provider));
    self.extraRules = ExtraRule.create(result.extraRules);
  }),
  setAuthToken: (authToken) => {
    self.authToken = authToken;
    localStorage.setItem('chemotion-auth-token', authToken);
  },
  setRole: (role) => {
    self.role = role;
    localStorage.setItem('chemotion-role', role);
  }
})).views((self) => ({
  isUserQuotaExceeded(filteredAttachments) {
    const totalSize = filteredAttachments.filter((attachment) => attachment.is_new && !attachment.is_deleted)
      .reduce((acc, attachment) => acc + attachment.filesize, 0);
    const { currentUser } = self;
    return currentUser !== null && currentUser.allocated_space !== 0
      && totalSize > (currentUser.allocated_space - currentUser.used_space);
  },
  allGenericElements() {
    if (!self.currentUser) { return []; }
    if (!MatrixCheck(self.currentUser.matrix, 'genericElement')) { return []; }

    return values(self.genericEls);
  }
}));

export default UserStore;

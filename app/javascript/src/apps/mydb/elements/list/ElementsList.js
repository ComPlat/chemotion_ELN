import Immutable from 'immutable';
import React from 'react';
import { Tabs, Tab, Tooltip, OverlayTrigger, Button, ButtonGroup } from 'react-bootstrap';
import KeyboardActions from 'src/stores/alt/actions/KeyboardActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import MatrixCheck from 'src/components/common/MatrixCheck';
import ElementsTable from 'src/apps/mydb/elements/list/ElementsTable';
import ElementsTableSettings from 'src/apps/mydb/elements/list/ElementsTableSettings';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import { StoreContext } from 'src/stores/mobx/RootStore';
import PropTypes from 'prop-types';
import ManagingActions from 'src/components/managingActions/ManagingActions';
import CreateButton from 'src/components/contextActions/CreateButton';
import PrintCodeButton from 'src/components/contextActions/PrintCodeButton';
import SplitElementButton from 'src/components/contextActions/SplitElementButton';
import ExportImportButton from 'src/components/contextActions/ExportImportButton';

function getVisibleAndHiddenFromLayout(layout) {
  const visible = [], hidden = [];
  Object.keys(layout).forEach((key) => {
    if (layout[key] < 0) {
      hidden.push(key);
    } else {
      visible.push(key);
    }
  });

  return {
    visible: Immutable.List(visible).sortBy((t) => layout[t]),
    hidden: Immutable.List(hidden).sortBy((t) => -1 * layout[t]),
  };
}

export default class ElementsList extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      totalElements: {},
      visible: Immutable.List(),
      hidden: Immutable.List(),
      genericEls: [],
      currentTab: 0,
      totalCheckedElements: {},
    };

    this.onChange = this.onChange.bind(this);
    this.onChangeUser = this.onChangeUser.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);
    this.handleTabSelect = this.handleTabSelect.bind(this);
  }

  componentDidMount() {
    ElementStore.listen(this.onChange);
    UserStore.listen(this.onChangeUser);
    UIStore.listen(this.onChangeUI);

    this.onChange(ElementStore.getState());
    this.onChangeUser(UserStore.getState());
    this.onChangeUI(UIStore.getState());
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange);
    UserStore.unlisten(this.onChangeUser);
    UIStore.unlisten(this.onChangeUI);
  }

  onChange(state) {
    const { totalElements } = this.state;
    Object.keys(state.elements).forEach((key) => {
      totalElements[key] = state.elements[key]?.totalElements;
    });

    this.setState({
      totalElements
    });
  }

  onChangeUser(state) {
    let visible = Immutable.List();
    let hidden = Immutable.List();
    let { currentType, currentTab } = state;

    if (state?.profile?.data?.layout) {
      const profileConfig = getVisibleAndHiddenFromLayout(state.profile.data.layout);
      visible = profileConfig.visible;
      hidden = profileConfig.hidden;

      currentTab = visible.findIndex((e) => e === currentType);
      if (currentType === '') { currentType = visible.get(0); }
    }

    if (currentTab < 0) currentTab = 0;

    if (typeof currentType !== 'undefined' && currentType != null) {
      KeyboardActions.contextChange.defer(currentType);
    }

    this.setState({
      genericEls: state.genericEls || [],
      currentTab,
      visible,
      hidden
    });
  }

  onChangeUI(state) {
    const { totalCheckedElements } = this.state;
    // const genericNames = (genericEls && genericEls.map(el => el.name)) || [];
    let genericKlasses = [];
    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
    if (MatrixCheck(currentUser.matrix, 'genericElement')) {
      const { klasses } = UIStore.getState();
      genericKlasses = klasses;
    }
    const elNames = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan', 'cell_line'].concat(genericKlasses);

    const newTotalCheckedElements = {};
    let needsUpdate = false;
    elNames.forEach((type) => {
      const elementUI = state[type] || {
        checkedAll: false,
        checkedIds: Immutable.List(),
        uncheckedIds: Immutable.List(),
      };
      const element = ElementStore.getState().elements[`${type}s`];
      const nextCount = elementUI.checkedAll
        ? (element.totalElements - elementUI.uncheckedIds.size)
        : elementUI.checkedIds.size;
      needsUpdate = needsUpdate || nextCount !== totalCheckedElements[type];
      newTotalCheckedElements[type] = nextCount
    });

    if (needsUpdate) {
      this.setState({ totalCheckedElements: newTotalCheckedElements });
    }
  }

  handleRemoveSearchResult(searchStore) {
    searchStore.changeShowSearchResultListValue(false);
    UIActions.clearSearchById();
    ElementActions.changeSorting(false);
    const { currentCollection } = UIStore.getState();
    UIActions.selectCollection(currentCollection);
  }

  handleTabSelect(tab) {
    UserActions.selectTab(tab);

    // TODO sollte in tab action handler
    const uiState = UIStore.getState();
    const type = this.state.visible.get(tab);

    if (!uiState[type] || !uiState[type].page) { return; }

    const { page } = uiState[type];

    UIActions.setPagination({ type, page });

    KeyboardActions.contextChange(type);
  }

  render() {
    const {
      visible, hidden, totalCheckedElements, totalElements, currentTab
    } = this.state;
    const { overview } = this.props;

    const constEls = Immutable.Set([
      'sample',
      'reaction',
      'screen',
      'wellplate',
      'research_plan',
      'cell_line'
    ]);
    const tabItems = visible.map((value, i) => {
      let iconClass = `icon-${value}`;
      let ttl = (
        <Tooltip>
          {value && (value.replace('_', ' ').replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()))}
        </Tooltip>
      );

      let genericEl = null;
      if (!constEls.has(value)) {
        const { genericEls } = this.state;
        genericEl = (genericEls && genericEls.find((el) => el.name === value)) || {};
        iconClass = `${genericEl.icon_name} icon_generic_nav`;
        ttl = (
          <Tooltip>
            {genericEl.label}
            <br />
            {genericEl.desc}
          </Tooltip>
        );
      }

      const title = (
        <OverlayTrigger
          overlay={ttl}
          placement="top"
        >
          <span>
            <i className={`me-1 ${iconClass}`} />
            {`${totalElements[`${value}s`] || 0} (${totalCheckedElements[value] || 0})`}
          </span>
        </OverlayTrigger>
      );

      return (
        <Tab
          key={value}
          eventKey={i}
          title={title}
          className={`elements-list-tab-${value}s`}
        >
          <ElementsTable
            overview={overview}
            type={value}
            genericEl={genericEl}
          />
        </Tab>
      );
    });

    return (
      <>
        {UIStore.getState().currentSearchByID && (
          <Button
            variant="info"
            onClick={() => this.handleRemoveSearchResult(this.context.search)}
            className="w-100 p-3 mb-3 text-start fs-5"
          >
            Remove search result
          </Button>
        )}
        <div className="d-flex flex-column gap-1 h-100">
          <div className="d-flex gap-2 mb-3">
            <ManagingActions />
            <ButtonGroup className="d-flex align-items-center">
              <SplitElementButton />
              <CreateButton />
            </ButtonGroup>
            <ExportImportButton />
            <PrintCodeButton />
          </div>
          <div className="tabs-container--with-full-height position-relative">
            <div className="position-absolute top-0 end-0">
              <ElementsTableSettings
                visible={visible}
                hidden={hidden}
              />
            </div>

            <Tabs
              id="tabList"
              activeKey={currentTab}
              onSelect={(eventKey) => this.handleTabSelect(parseInt(eventKey, 10))}
              className="sheet-tabs"
            >
              {tabItems}
            </Tabs>
          </div>
        </div>
      </>
    );
  }
}

ElementsList.propTypes = {
  overview: PropTypes.bool.isRequired,
};
/* eslint-disable no-param-reassign */
/* eslint-disable react/require-default-props */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Overlay, Popover } from 'react-bootstrap';
import Immutable from 'immutable';
import _, { isEmpty } from 'lodash';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import TabLayoutEditor from 'src/apps/mydb/elements/tabLayout/TabLayoutEditor';
import UIStore from 'src/stores/alt/stores/UIStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import { capitalizeWords } from 'src/utilities/textHelper';
import { filterTabLayout, getArrayFromLayout } from 'src/utilities/CollectionTabsHelper';

export default class ElementDetailSortTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: Immutable.List(),
      hidden: Immutable.List(),
      showTabLayoutContainer: false
    };

    this.onChangeUser = this.onChangeUser.bind(this);
    this.onCloseTabLayoutContainer = this.onCloseTabLayoutContainer.bind(this);
    this.toggleTabLayoutContainer = this.toggleTabLayoutContainer.bind(this);

    UserActions.fetchCurrentUser();
  }

  componentDidMount() {
    UserStore.listen(this.onChangeUser);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChangeUser);
  }

  onChangeUser(state) {
    const { addInventoryTab, availableTabs, type } = this.props;
    const { currentCollection } = UIStore.getState();
    const collectionTabs = currentCollection?.tabs_segment;
    let layout;
    if (!collectionTabs || _.isEmpty(collectionTabs[`${type}`])) {
      layout = state.profile && state.profile.data && state.profile.data[`layout_detail_${type}`];
    } else {
      layout = collectionTabs[`${type}`];
    }
    const { visible, hidden } = getArrayFromLayout(layout, type, addInventoryTab, availableTabs);
    const { onTabPositionChanged } = this.props;

    this.setState(
      { visible, hidden },
      () => onTabPositionChanged(visible)
    );
  }

  onCloseTabLayoutContainer() {
    this.setState(
      (state) => ({ ...state, showTabLayoutContainer: false }),
      () => this.updateLayout()
    );
  }

  toggleTabLayoutContainer() {
    const { showTabLayoutContainer } = this.state;
    const isClosing = showTabLayoutContainer;
    this.setState(
      (state) => ({ ...state, showTabLayoutContainer: !state.showTabLayoutContainer }),
      () => {
        if (isClosing) this.updateLayout();
      }
    );
  }

  updateLayout() {
    const layout = filterTabLayout(this.state);
    const { currentCollection } = UIStore.getState();
    const { type } = this.props;
    let tabSegment = currentCollection?.tabs_segment;
    _.set(tabSegment, `${type}`, layout);
    tabSegment = { ...tabSegment, [`${type}`]: layout };
    if (currentCollection && !currentCollection.is_sync_to_me) {
      CollectionActions.updateTabsSegment({ segment: tabSegment, cId: currentCollection.id });
    }

    const userProfile = UserStore.getState().profile;
    const layoutName = `data.layout_detail_${type}`;
    _.set(userProfile, layoutName, layout);

    UserActions.updateUserProfile(userProfile);
  }

  onLayoutChange = (visible, hidden) => {
    this.setState({ visible, hidden });
  }

  render() {
    const { visible, hidden, showTabLayoutContainer } = this.state;
    const { tabTitles } = this.props;
    const { currentCollection } = UIStore.getState();
    const tabs = currentCollection?.tabs_segment;
    const buttonInfo = isEmpty(tabs) ? 'info' : 'light';

    const popoverSettings = (
      <Popover>
        <Popover.Header>Tab Layout</Popover.Header>
        <Popover.Body>
          <TabLayoutEditor
            visible={visible}
            hidden={hidden}
            getItemComponent={({item}) => (<div>{tabTitles[item] ?? capitalizeWords(item)}</div>)}
            onLayoutChange={this.onLayoutChange}
          />
        </Popover.Body>
      </Popover>
    );

    const buttonRef = React.createRef(null);

    return (
      <>
        <Button
          variant={buttonInfo}
          className="float-end"
          ref={buttonRef}
          size="sm"
          onClick={this.toggleTabLayoutContainer}
          title="Tabs layout for all collections can also be managed in Collection Tabs page"
        >
          <i className="fa fa-sliders" aria-hidden="true" />
        </Button>
        <Overlay
          onHide={this.onCloseTabLayoutContainer}
          target={buttonRef}
          placement="left"
          rootClose
          show={showTabLayoutContainer}
        >
          {popoverSettings}
        </Overlay>
      </>
    );
  }
}

ElementDetailSortTab.propTypes = {
  type: PropTypes.string.isRequired,
  onTabPositionChanged: PropTypes.func.isRequired,
  availableTabs: PropTypes.arrayOf(PropTypes.string).isRequired,
  tabTitles: PropTypes.object,
  addInventoryTab: PropTypes.bool,
};

ElementDetailSortTab.defaultProps = {
  tabTitles: {},
  addInventoryTab: false,
};

/* eslint-disable no-param-reassign */
/* eslint-disable react/require-default-props */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'react-bootstrap';
import Immutable from 'immutable';
import { isEmpty, set } from 'lodash';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import TabLayoutEditor from 'src/apps/mydb/elements/tabLayout/TabLayoutEditor';
import ConfigOverlayButton from 'src/components/common/ConfigOverlayButton';
import UIStore from 'src/stores/alt/stores/UIStore';
import { capitalizeWords } from 'src/utilities/textHelper';
import { filterTabLayout, getArrayFromLayout } from 'src/utilities/CollectionTabsHelper';
import { StoreContext } from 'src/stores/mobx/RootStore';

export default class ElementDetailSortTab extends Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      visible: Immutable.List(),
      hidden: Immutable.List(),
      showTabLayoutContainer: false
    };

    this.onChangeUser = this.onChangeUser.bind(this);
    this.toggleTabLayoutContainer = this.toggleTabLayoutContainer.bind(this);

    UserActions.fetchCurrentUser();
  }

  componentDidMount() {
    UserStore.listen(this.onChangeUser);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChangeUser);
  }

  updateTabLayout(layout) {
    const { addInventoryTab, availableTabs, type, onTabPositionChanged } = this.props;

    // Ensure default tabs exist in layout (for backward compatibility)
    if (layout && availableTabs) {
      const defaultTabs = ['properties', 'analyses'];
      const layoutKeys = Object.keys(layout);
      const maxOrder = Math.max(0, ...layoutKeys.map(k => Math.abs(layout[k])));

      defaultTabs.forEach((tab, idx) => {
        if (!layoutKeys.includes(tab) && availableTabs.includes(tab)) {
          layout[tab] = maxOrder + idx + 1;
        }
      });
    }

    const { visible, hidden } = getArrayFromLayout(layout, type, addInventoryTab, availableTabs);
    this.setState({ visible, hidden }, () => onTabPositionChanged(visible));
  }

  getOpenedFromCollection() {
    const { openedFromCollectionId } = this.props;
    const stack = [
      this.context.collections.own_collection_tree,
      this.context.collections.shared_with_me_collection_tree
    ];
    while (stack.length > 0) {
      const col = stack.pop();
      if (col.id == openedFromCollectionId) return col;
      if (col.children?.length > 0) stack.push(...col.children);
    }
    return null;
  }

  onChangeUser(state) {
    const { type } = this.props;
    const collection = this.getOpenedFromCollection() || UIStore.getState().currentCollection;

    const collectionTabs = typeof (collection?.tabs_segment) == 'string'
      ? JSON.parse(collection?.tabs_segment)
      : collection?.tabs_segment;

    const layout = (!collectionTabs || isEmpty(collectionTabs[`${type}`]))
      ? state.profile?.data?.[`layout_detail_${type}`]
      : collectionTabs[`${type}`];
    this.updateTabLayout(layout);
  }

  toggleTabLayoutContainer(show) {
    this.setState(
      (state) => ({ ...state, showTabLayoutContainer: !state.showTabLayoutContainer }),
      () => {
        if (!show) this.updateLayout();
      }
    );
  }

  updateLayout() {
    const layout = filterTabLayout(this.state);
    const { currentCollection } = UIStore.getState();
    const { type } = this.props;
    const tabSegment = { ...currentCollection?.tabs_segment, [type]: layout };

    this.context.collections.updateCollection(currentCollection, tabSegment);

    const userProfile = UserStore.getState().profile;
    set(userProfile, `data.layout_detail_${type}`, layout);
    UserActions.updateUserProfile(userProfile);
  }

  onLayoutChange = (visible, hidden) => {
    this.setState({ visible, hidden });
  };

  render() {
    const { visible, hidden } = this.state;
    const { tabTitles } = this.props;
    const { currentCollection } = UIStore.getState();
    const isOwnCollection = this.context.collections.isOwnCollection(currentCollection?.id);
    const allCollection = currentCollection?.is_locked && currentCollection.label === 'All';
    if (!isOwnCollection && !allCollection) { return null; }

    const popoverSettings = (
      <Popover>
        <Popover.Header>Tab Layout</Popover.Header>
        <Popover.Body>
          <TabLayoutEditor
            visible={visible}
            hidden={hidden}
            getItemComponent={({ item }) => (<div>{tabTitles[item] ?? capitalizeWords(item)}</div>)}
            onLayoutChange={this.onLayoutChange}
          />
        </Popover.Body>
      </Popover>
    );

    return (
      <ConfigOverlayButton onToggle={this.toggleTabLayoutContainer} popoverSettings={popoverSettings} />
    );
  }
}

ElementDetailSortTab.propTypes = {
  type: PropTypes.string.isRequired,
  onTabPositionChanged: PropTypes.func.isRequired,
  availableTabs: PropTypes.arrayOf(PropTypes.string).isRequired,
  tabTitles: PropTypes.object,
  addInventoryTab: PropTypes.bool,
  openedFromCollectionId: PropTypes.number,
};

ElementDetailSortTab.defaultProps = {
  tabTitles: {},
  addInventoryTab: false,
};

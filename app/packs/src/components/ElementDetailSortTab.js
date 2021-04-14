/* eslint-disable no-param-reassign */
/* eslint-disable react/prop-types */
/* eslint-disable react/require-default-props */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';
import Immutable from 'immutable';
import _ from 'lodash';
import UserStore from './stores/UserStore';
import UserActions from './actions/UserActions';
import TabLayoutContainer from './TabLayoutContainer';

const getNodeText = (node) => {
  if (['string', 'number'].includes(typeof node)) return node;
  if (node instanceof Array) return node.map(getNodeText).join('');
  if (typeof node === 'object' && node) {
    if (node.props.children) {
      return getNodeText(node.props.children);
    } else if (node.props.alt) {
      return getNodeText(node.props.alt);
    }
    return '';
  }
  return '';
};

const getArrayFromLayout = (layout, availableTabs) => {
  const layoutKeys = Object.keys(layout);
  const enabled = availableTabs.filter(val => layoutKeys.includes(val));
  const leftover = availableTabs.filter(val => !layoutKeys.includes(val));
  const visible = [];
  const hidden = [];

  enabled.forEach((key) => {
    const order = layout[key];
    if (order < 0) { hidden[Math.abs(order)] = key; }
    if (order > 0) { visible[order] = key; }
  });

  leftover.forEach(key => hidden.push(key));

  let first = null;
  if (visible.length === 0) {
    first = hidden.filter(n => n !== undefined)[0];
    if (first) {
      visible.push(first);
    }
  }
  if (hidden.length === 0) {
    hidden.push('hidden');
  }
  return {
    visible: Immutable.List(visible.filter(n => n !== undefined)),
    hidden: Immutable.List(hidden.filter(n => (n !== undefined && n !== first)))
  };
};


export default class ElementDetailSortTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: Immutable.List(),
      hidden: Immutable.List(),
    };

    this.type = props.type;

    this.onChangeUser = this.onChangeUser.bind(this);
    this.handleOnLayoutChanged = this.handleOnLayoutChanged.bind(this);

    UserActions.fetchCurrentUser();
  }

  componentDidMount() {
    UserStore.listen(this.onChangeUser);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChangeUser);
  }

  onChangeUser(state) {
    const layout = (state.profile && state.profile.data && state.profile.data[`layout_detail_${this.type}`]) || {};
    const { visible, hidden } = getArrayFromLayout(layout, this.props.availableTabs);

    this.setState(
      { visible, hidden },
      () => this.props.onTabPositionChanged(visible)
    );
  }

  handleOnLayoutChanged() {
    this.updateLayout();
  }

  updateLayout() {
    const { visible, hidden } = this.layout.state;
    const layout = {};

    visible.forEach((value, index) => {
      layout[value] = (index + 1);
    });
    hidden.filter(val => val !== 'hidden').forEach((value, index) => {
      layout[value] = (-index - 1);
    });

    const userProfile = UserStore.getState().profile;
    const layoutName = `data.layout_detail_${this.type}`;
    _.set(userProfile, layoutName, layout);
    UserActions.updateUserProfile(userProfile);
  }

  render() {
    const {
      visible, hidden
    } = this.state;
    const popoverSettings = (
      <Popover
        className="collection-overlay"
        id="popover-layout"
        style={{ maxWidth: 'none', width: 'auto' }}
      >
        <div>
          <h3 className="popover-title">Tabs Layout</h3>
          <div className="popover-content">
            <TabLayoutContainer
              visible={visible}
              hidden={hidden}
              tabTitles={this.props.tabTitles}
              isElementDetails
              ref={(n) => { this.layout = n; }}
            />
          </div>
        </div>
      </Popover>
    );
    return (
      <OverlayTrigger
        trigger="click"
        placement="left"
        overlay={popoverSettings}
        rootClose
        onExit={this.handleOnLayoutChanged}
      >
        <Button bsStyle="info" bsSize="xsmall" className="button-right">
          <i className="fa fa-sliders" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }
}

ElementDetailSortTab.propTypes = {
  onTabPositionChanged: PropTypes.func,
  availableTabs: PropTypes.arrayOf(PropTypes.string),
  tabTitles: PropTypes.object
};

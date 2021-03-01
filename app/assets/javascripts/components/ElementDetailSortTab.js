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
import ArrayUtils from './utils/ArrayUtils';
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
    let visible = '';
    let hidden = '';

    if (typeof (state.profile) !== 'undefined' && state.profile &&
            typeof (state.profile.data) !== 'undefined' && state.profile.data) {
      let layout = {};
      if (this.type === 'research_plan') {
        layout = state.profile.data.layout_detail_research_plan;
      } else if (this.type === 'sample') {
        layout = state.profile.data.layout_detail_sample;
      } else if (this.type === 'reaction') {
        layout = state.profile.data.layout_detail_reaction;
      } else if (this.type === 'screen') {
        layout = state.profile.data.layout_detail_screen;
      } else if (this.type === 'wellplate') {
        layout = state.profile.data.layout_detail_wellplate;
      }

      visible = this.getArrayFromLayout(layout, true);
      hidden = this.getArrayFromLayout(layout, false);
    }
    if (hidden.size === 0) {
      hidden = ArrayUtils.pushUniq(hidden, 'hidden');
    }

    this.setState({
      visible,
      hidden
    });

    this.props.onTabPositionChanged(visible, hidden);
  }


  getArrayFromLayout(layout, isVisible) {
    let array = Immutable.List();

    const { xtabs } = this.props;
    if (xtabs) {
      for (let j = 0; j < xtabs.count; j += 1) {
        const title = `${j}_xtab_${getNodeText(xtabs[`title${j}`])}`;
        if (!layout[title]) {
          layout[title] = 100 + j;
        }
      }
    }

    const { enableComputedProps } = this.props;
    if (enableComputedProps !== undefined) {
      if (enableComputedProps && !layout.computed_props) {
        layout.computed_props = 200;
      }
    }

    Object.keys(layout).forEach((key) => {
      const order = layout[key];
      if (isVisible && order < 0) { return; }
      if (!isVisible && order > 0) { return; }

      array = array.set(Math.abs(order), key);
    });

    array = array.filter(n => n !== undefined);

    return array;
  }

  handleOnLayoutChanged() {
    this.updateLayout();
  }

  updateLayout() {
    const { visible, hidden } = this.layout.state;
    const layout = {};

    visible.forEach((value, index) => {
      layout[value] = (index + 1).toString();
    });
    hidden.forEach((value, index) => {
      if (value !== 'hidden') layout[value] = (-index - 1).toString();
    });

    const userProfile = UserStore.getState().profile;

    let layoutName = '';
    if (this.type === 'research_plan') {
      layoutName = 'data.layout_detail_research_plan';
    } else if (this.type === 'sample') {
      layoutName = 'data.layout_detail_sample';
    } else if (this.type === 'reaction') {
      layoutName = 'data.layout_detail_reaction';
    } else if (this.type === 'screen') {
      layoutName = 'data.layout_detail_screen';
    } else if (this.type === 'wellplate') {
      layoutName = 'data.layout_detail_wellplate';
    }
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
};

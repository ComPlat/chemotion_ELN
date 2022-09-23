import React from 'react';
import { Popover, Button, FormGroup, Checkbox, OverlayTrigger } from 'react-bootstrap';
import _ from 'lodash';

import TabLayoutContainer from 'src/apps/mydb/elements/tabLayout/TabLayoutContainer';

import UserActions from 'src/stores/alt/actions/UserActions';
import UIActions from 'src/stores/alt/actions/UIActions';

import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class ElementsTableSettings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: props.visible,
      hidden: props.hidden,
      currentType: '',
      showSampleExternalLabel: false,
      showSampleShortLabel: false,
      showSampleName: false,
      tableSchemePreviews: true
    }

    this.handleOnExit = this.handleOnExit.bind(this);
    this.handleToggleSampleExt = this.handleToggleSampleExt.bind(this);
    this.handleToggleSampleShortLabel = this.handleToggleSampleShortLabel.bind(this);
    this.handleToggleSampleName = this.handleToggleSampleName.bind(this);
    this.handleToggleScheme = this.handleToggleScheme.bind(this);
    this.onChangeUser = this.onChangeUser.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChangeUser);
    UIStore.listen(this.onChangeUI);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChangeUser);
    UIStore.unlisten(this.onChangeUI);
  }

  onChangeUI(state) {
    const tableSchemePreviews = state.showPreviews;

    if (this.state.tableSchemePreviews != tableSchemePreviews) {
      this.setState({ tableSchemePreviews });
    }
  }

  onChangeUser(state) {
    let { currentType } = this.state;
    if (state && state.profile) {
      this.setState({
        showSampleExternalLabel: state.profile.show_external_name,
        showSampleName: state.profile.show_sample_name,
        showSampleShortLabel: state.profile.show_sample_short_label
      });
    }
    if (state && (currentType !== state.currentType)) {
      this.setState({ currentType: state.currentType });
    }
  }

  handleOnExit() {
    this.updateLayout();

    if (this.state.currentType == "sample" || this.state.currentType == "reaction") {
      const show_previews = UIStore.getState().showPreviews;
      const cur_previews = this.state.tableSchemePreviews;
      if (cur_previews != show_previews) {
        UIActions.toggleShowPreviews(cur_previews);

      }

    }

    const { showSampleExternalLabel, showSampleShortLabel, showSampleName } = this.state;

    UserActions.updateUserProfile({
      show_external_name: showSampleExternalLabel,
      show_sample_short_label: showSampleShortLabel,
      show_sample_name: showSampleName
    });
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      visible: nextProps.visible,
      hidden: nextProps.hidden
    });
  }

  handleToggleScheme() {
    const { tableSchemePreviews } = this.state;
    this.setState({ tableSchemePreviews: !tableSchemePreviews });
  }

  handleToggleSampleExt() {
    const { showSampleExternalLabel } = this.state;
    this.setState({
      showSampleExternalLabel: !showSampleExternalLabel,
      showSampleShortLabel: false,
      showSampleName: false
    });
  }

  handleToggleSampleShortLabel() {
    const { showSampleShortLabel } = this.state;
    this.setState({
      showSampleShortLabel: !showSampleShortLabel,
      showSampleExternalLabel: false,
      showSampleName: false
    });
  }

  handleToggleSampleName() {
    const { showSampleName } = this.state;
    this.setState({
      showSampleName: !showSampleName,
      showSampleExternalLabel: false,
      showSampleShortLabel: false
    });
  }

  updateLayout() {
    const { visible, hidden } = this.layout.state;
    const layout = {};

    visible.forEach((value, index) => {
      layout[value] = (index + 1);
    });
    hidden.forEach((value, index) => {
      if (value !== 'hidden') layout[value] = (- index - 1)
    });

    const userProfile = UserStore.getState().profile;
    _.set(userProfile, 'data.layout', layout);
    UserActions.updateUserProfile(userProfile);
  }

  render() {
    const {
      visible, hidden, currentType,
      tableSchemePreviews, showSampleExternalLabel, showSampleShortLabel, showSampleName,
    } = this.state;

    const wd = 35 + ((visible && visible.size * 50) || 0) + ((hidden && hidden.size * 50) || 0);

    let sampleSettings = (<span />);
    if (currentType == "sample" || currentType == "reaction") {
      sampleSettings = (
        <div>
          <h3 className="popover-title">Settings</h3>
          <div className="popover-content">
            <FormGroup>
              <Checkbox
                onChange={this.handleToggleScheme}
                checked={tableSchemePreviews}
              >
                Show schemes images
              </Checkbox>
            </FormGroup>
            <FormGroup>
              <Checkbox
                onChange={this.handleToggleSampleExt}
                checked={showSampleExternalLabel}
              >
                Show sample external name on title
              </Checkbox>
              <Checkbox
                onChange={this.handleToggleSampleShortLabel}
                checked={showSampleShortLabel}
              >
                Show sample short label
              </Checkbox>
              <Checkbox
                onChange={this.handleToggleSampleName}
                checked={showSampleName}
              >
                Show sample name
              </Checkbox>
            </FormGroup>
          </div>
        </div>
      )
    }
    const popoverSettings = (
      <Popover
        className="collection-overlay"
        id="popover-layout"
        style={{ maxWidth: 'none', width: `${wd}px` }}
      >
        <div>
          <h3 className="popover-title">Table Layout</h3>
          <div className="popover-content">
            <TabLayoutContainer
              visible={visible}
              hidden={hidden}
              ref={(n) => { this.layout = n; }}
            />
          </div>
        </div>
        {sampleSettings}
      </Popover>
    )

    return (
      <OverlayTrigger
        trigger="click"
        placement="left"
        overlay={popoverSettings}
        rootClose
        onExit={this.handleOnExit}
      >
        <Button
          bsSize="xsmall"
          style={{ margin: '10px 10px 10px 0', float: 'right' }}
        >
          <i className="fa fa-sliders" />
        </Button>
      </OverlayTrigger>
    );
  }
}

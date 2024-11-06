import React from 'react';
import { Popover, Button, Form, OverlayTrigger } from 'react-bootstrap';

import TabLayoutContainer from 'src/apps/mydb/elements/tabLayout/TabLayoutContainer';

import UserActions from 'src/stores/alt/actions/UserActions';
import UIActions from 'src/stores/alt/actions/UIActions';

import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class ElementsTableSettings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentType: '',
      showSampleExternalLabel: false,
      showSampleShortLabel: false,
      showSampleName: false,
      tableSchemePreviews: true
    }

    this.onToggleTabLayoutContainer = this.onToggleTabLayoutContainer.bind(this);
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

  onToggleTabLayoutContainer(show) {
    if (!show) {
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
    const { visible, hidden } = this.tabLayoutContainerElement.state;
    const layout = {};

    visible.forEach((value, index) => {
      layout[value] = (index + 1);
    });
    hidden.forEach((value, index) => {
      if (value !== 'hidden') layout[value] = (- index - 1)
    });

    const userProfile = UserStore.getState().profile;
    userProfile.data.layout = layout;
    UserActions.updateUserProfile(userProfile);
  }

  render() {
    const { visible, hidden } = this.props;
    const {
      currentType,
      tableSchemePreviews,
      showSampleExternalLabel,
      showSampleShortLabel,
      showSampleName,
    } = this.state;

    const tabLayoutContainerElement = (
      <TabLayoutContainer
        visible={visible}
        hidden={hidden}
        ref={(tabLayoutContainerElement) => this.tabLayoutContainerElement = tabLayoutContainerElement}
      />
    );

    const showSettings = (currentType === 'sample' || currentType === 'reaction');
    const popoverSettings = (
      <Popover
        className="scrollable-popover w-auto mw-100"
        id="popover-layout"
      >
        <Popover.Header>
          Tab Layout
        </Popover.Header>
        <Popover.Body>
          {tabLayoutContainerElement}
        </Popover.Body>
        {showSettings && (
          <>
            <Popover.Header>Settings</Popover.Header>
            <Popover.Body>
              <Form>
                <Form.Check
                  type="checkbox"
                  onChange={this.handleToggleScheme}
                  checked={tableSchemePreviews}
                  label="Show schemes images"
                />
                <Form.Check
                  type="checkbox"
                  onChange={this.handleToggleSampleExt}
                  checked={showSampleExternalLabel}
                  label="Show sample external name on title"
                />
                <Form.Check
                  type="checkbox"
                  onChange={this.handleToggleSampleShortLabel}
                  checked={showSampleShortLabel}
                  label="Show sample short label"
                />
                <Form.Check
                  type="checkbox"
                  onChange={this.handleToggleSampleName}
                  checked={showSampleName}
                  label="Show sample name"
                />
              </Form>
            </Popover.Body>
          </>
        )}
      </Popover>
    );

    return (
      <OverlayTrigger
        trigger="click"
        placement="bottom"
        overlay={popoverSettings}
        onToggle={this.onToggleTabLayoutContainer}
        rootClose
      >
        <Button
          size="xsm"
          variant="light"
          className="m-2"
        >
          <i className="fa fa-sliders" />
        </Button>
      </OverlayTrigger>
    );
  }
}

import React from 'react';
import { Popover, Form } from 'react-bootstrap';

import TabLayoutEditor from 'src/apps/mydb/elements/tabLayout/TabLayoutEditor';
import TabLayoutButton from 'src/apps/mydb/elements/tabLayout/TabLayoutButton';

import UserActions from 'src/stores/alt/actions/UserActions';
import UIActions from 'src/stores/alt/actions/UIActions';

import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import { capitalizeWords } from 'src/utilities/textHelper';

function TabItem({ item }) {
  const { genericEls = [] } = UserStore.getState();
  const genericElement = genericEls.find((el) => el.name === item);

  let icon, label;
  if (genericElement) {
    icon = genericElement.icon_name;
    label = genericElement.label;
  } else {
    icon = `icon-${item}`;
    label = capitalizeWords(item);
  }

  return (
    <div className="d-flex gap-2 align-items-center">
      <i className={icon} />
      {label}
    </div>
  )
};

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
    this.onChangeUser(UserStore.getState());
    UIStore.listen(this.onChangeUI);
    this.onChangeUI(UIStore.getState());
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChangeUser);
    UIStore.unlisten(this.onChangeUI);
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.visible !== this.props.visible
      || prevProps.hidden !== this.props.hidden
    ) {
      this.setState({
        visible: this.props.visible,
        hidden: this.props.hidden,
      });
    }
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
    const { visible, hidden } = this.state;
    const layout = {};

    visible.forEach((value, index) => {
      layout[value] = (index + 1);
    });
    hidden.forEach((value, index) => {
      layout[value] = (- index - 1);
    });

    const userProfile = UserStore.getState().profile;
    userProfile.data.layout = layout;
    UserActions.updateUserProfile(userProfile);
  }

  render() {
    const {
      visible,
      hidden,
      currentType,
      tableSchemePreviews,
      showSampleExternalLabel,
      showSampleShortLabel,
      showSampleName,
    } = this.state;

    const showSettings = (currentType === 'sample' || currentType === 'reaction');
    const popoverSettings = (
      <Popover className="d-flex popover-multi">
        {showSettings && (
          <div className="popover-multi-item">
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
          </div>
        )}
        <div className="popover-multi-item">
          <Popover.Header>
            Tab Layout
          </Popover.Header>
          <Popover.Body>
            <TabLayoutEditor
              visible={visible}
              hidden={hidden}
              getItemComponent={TabItem}
              onLayoutChange={(visible, hidden) => {
                this.setState({ visible, hidden });
              }}
            />
          </Popover.Body>
        </div>
      </Popover>
    );

    return (
      <TabLayoutButton popoverSettings={popoverSettings} onToggle={this.onToggleTabLayoutContainer} />
    );
  }
}

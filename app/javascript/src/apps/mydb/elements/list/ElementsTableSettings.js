import React from 'react';
import { CloseButton, Popover, Form } from 'react-bootstrap';

import TabLayoutEditor from 'src/apps/mydb/elements/tabLayout/TabLayoutEditor';
import ConfigOverlayButton from 'src/components/common/ConfigOverlayButton';

import UserActions from 'src/stores/alt/actions/UserActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';

import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import { capitalizeWords } from 'src/utilities/textHelper';
import { StoreContext } from 'src/stores/mobx/RootStore';

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
  static contextType = StoreContext;

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

    this.onTabLayoutClose = this.onTabLayoutClose.bind(this);
    this.handleToggleSampleExt = this.handleToggleSampleExt.bind(this);
    this.handleToggleSampleShortLabel = this.handleToggleSampleShortLabel.bind(this);
    this.handleToggleSampleName = this.handleToggleSampleName.bind(this);
    this.handleToggleScheme = this.handleToggleScheme.bind(this);
    this.onChangeUser = this.onChangeUser.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);
    this._saveLabelTimeout = null;
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
    if (this._saveLabelTimeout) {
      clearTimeout(this._saveLabelTimeout);
      this._saveLabelTimeout = null;
      const { showSampleExternalLabel, showSampleShortLabel, showSampleName } = this.state;
      UserActions.updateUserProfile({
        show_external_name: showSampleExternalLabel,
        show_sample_short_label: showSampleShortLabel,
        show_sample_name: showSampleName,
      });
    }
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
    if (state && state.profile && !this._saveLabelTimeout) {
      this.setState({
        showSampleExternalLabel: !!state.profile.show_external_name,
        showSampleName: !!state.profile.show_sample_name,
        showSampleShortLabel: !!state.profile.show_sample_short_label
      });
    }
    if (state && (currentType !== state.currentType)) {
      this.setState({ currentType: state.currentType });
    }
  }

  onTabLayoutClose() {
    clearTimeout(this._saveLabelTimeout);
    this._saveLabelTimeout = null;

    this.updateLayout();

    if (this.state.currentType === 'sample' || this.state.currentType === 'reaction') {
      const { showPreviews } = UIStore.getState();
      const curPreviews = this.state.tableSchemePreviews;
      if (curPreviews !== showPreviews) {
        UIActions.toggleShowPreviews(curPreviews);
      }
    }
  }

  handleToggleScheme() {
    const { tableSchemePreviews } = this.state;
    this.setState({ tableSchemePreviews: !tableSchemePreviews });
  }

  scheduleSaveLabels() {
    clearTimeout(this._saveLabelTimeout);
    this._saveLabelTimeout = setTimeout(() => {
      this._saveLabelTimeout = null;
      const { showSampleExternalLabel, showSampleShortLabel, showSampleName } = this.state;
      UserActions.updateUserProfile({
        show_external_name: showSampleExternalLabel,
        show_sample_short_label: showSampleShortLabel,
        show_sample_name: showSampleName,
      });
    }, 300);
  }

  handleToggleSampleExt() {
    this.setState(
      ({ showSampleExternalLabel }) => ({ showSampleExternalLabel: !showSampleExternalLabel }),
      this.scheduleSaveLabels
    );
  }

  handleToggleSampleShortLabel() {
    this.setState(
      ({ showSampleShortLabel }) => ({ showSampleShortLabel: !showSampleShortLabel }),
      this.scheduleSaveLabels
    );
  }

  handleToggleSampleName() {
    this.setState(
      ({ showSampleName }) => ({ showSampleName: !showSampleName }),
      this.scheduleSaveLabels
    );
  }

  updateLayout() {
    const { visible, hidden, showSampleExternalLabel, showSampleShortLabel, showSampleName } = this.state;
    const userProfile = UserStore.getState().profile;
    if (!userProfile) return;

    const layout = {};
    visible.forEach((value, index) => {
      layout[value] = (index + 1);
    });
    hidden.forEach((value, index) => {
      layout[value] = (- index - 1);
    });

    const { currentCollection } = UIStore.getState();
    const { collections } = this.context;
    const collectionId = currentCollection?.id;
    const savesToCollection = collections.isOwnCollection(collectionId)
      && !collections.isAllCollectionId(collectionId);
    const tabsChanged = !visible.equals(this.props.visible) || !hidden.equals(this.props.hidden);

    if (savesToCollection && tabsChanged) {
      collections.updateCollection(currentCollection, undefined, layout).then((saved) => {
        if (!saved || UIStore.getState().currentCollection?.id !== collectionId) return;
        UIActions.selectCollectionWithoutUpdating({ ...currentCollection, list_layout: saved.list_layout });
        ElementActions.refreshElementsAfterCollectionChanges(collectionId);
      });
    }

    UserActions.updateUserProfile({
      ...userProfile,
      data: savesToCollection ? userProfile.data : { ...(userProfile.data || {}), layout },
      show_external_name: showSampleExternalLabel,
      show_sample_short_label: showSampleShortLabel,
      show_sample_name: showSampleName,
    });
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

    const isAllCollection = this.context.collections.isAllCollectionId(UIStore.getState().currentCollection?.id);
    const showSettings = (currentType === 'sample' || currentType === 'reaction');
    const isSample = currentType === 'sample';
    const otherLabelChecked = showSampleExternalLabel || showSampleName;
    const shortLabelDisabled = !otherLabelChecked;
    const shortLabelChecked = shortLabelDisabled ? true : showSampleShortLabel;
    const popoverSettings = ({ close }) => (
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
                {isSample && (
                  <>
                    <Form.Check
                      type="checkbox"
                      onChange={this.handleToggleSampleExt}
                      checked={showSampleExternalLabel}
                      label="Show sample external label"
                    />
                    <Form.Check
                      type="checkbox"
                      onChange={this.handleToggleSampleShortLabel}
                      checked={shortLabelChecked}
                      disabled={shortLabelDisabled}
                      label="Show sample short label"
                    />
                    <Form.Check
                      type="checkbox"
                      onChange={this.handleToggleSampleName}
                      checked={showSampleName}
                      label="Show sample name"
                    />
                  </>
                )}
              </Form>
            </Popover.Body>
          </div>
        )}
        <div className="popover-multi-item">
          <Popover.Header className="d-flex justify-content-between align-items-center">
            Tab Layout
            <CloseButton onClick={close} />
          </Popover.Header>
          <Popover.Body>
            {isAllCollection && (
              <p className="text-muted small mb-2">Default for collections without their own layout.</p>
            )}
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
      <ConfigOverlayButton popoverSettings={popoverSettings} onClose={this.onTabLayoutClose} />
    );
  }
}

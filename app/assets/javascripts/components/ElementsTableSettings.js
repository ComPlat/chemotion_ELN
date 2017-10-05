import React from 'react';
import Immutable from 'immutable';
import {Popover, Button, FormGroup, Checkbox, OverlayTrigger} from 'react-bootstrap';

import TabLayoutContainer from './TabLayoutContainer';

import UserActions from './actions/UserActions';
import UIActions from './actions/UIActions';

import UIStore from './stores/UIStore';
import UserStore from './stores/UserStore';

export default class CreateButton extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: props.visible,
      hidden: props.hidden,
      currentType: "",
      showSampleExternalName: false,
      tableSchemePreviews: true
    }

    this.handleOnExit = this.handleOnExit.bind(this)
    this.handleToggleSampleExt = this.handleToggleSampleExt.bind(this)
    this.handleToggleScheme = this.handleToggleScheme .bind(this)
    this.onChangeUser = this.onChangeUser.bind(this)
    this.onChangeUI = this.onChangeUI.bind(this)
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
    let tableSchemePreviews = state.showPreviews;

    if (this.state.tableSchemePreviews != tableSchemePreviews) {
      this.setState({tableSchemePreviews})
    }
  }

  onChangeUser(state) {
    let {currentType, showSampleExternalName} = this.state;
    let showExt = showSampleExternalName;
    if (state.profile && state.profile.show_external_name) {
      showExt = state.profile.show_external_name;
    }

    if (currentType != state.currentType || showSampleExternalName != showExt) {
      this.setState({
        currentType: state.currentType,
        showSampleExternalName: showExt
      })
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

    const storeExt = UserStore.getState().profile.show_external_name;
    if (this.state.showSampleExternalName != storeExt) {
      UserActions.updateShowSampleExt(this.state.showSampleExternalName);
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      visible: nextProps.visible,
      hidden: nextProps.hidden
    })
  }

  handleToggleScheme() {
    const {tableSchemePreviews} = this.state;
    this.setState({tableSchemePreviews: !tableSchemePreviews});
  }

  handleToggleSampleExt() {
    const {showSampleExternalName} = this.state;
    this.setState({showSampleExternalName: !showSampleExternalName});
  }

  updateLayout() {
    let {visible, hidden} = this.refs.layout.state

    let layout = {}

    visible.forEach(function (value, index) {
      layout[value] = (index + 1).toString()
    })
    hidden.forEach(function (value, index) {
      if (value != "hidden") layout[value] = (- index - 1).toString()
    })

    UserActions.changeLayout(layout)
  }

  render() {
    const {
      visible, hidden, currentType,
      tableSchemePreviews, showSampleExternalName
    } = this.state

    let sampleSettings = (<span />)
    if (currentType == "sample" || currentType == "reaction") {
      sampleSettings = (
        <div>
          <h3 className="popover-title">Settings</h3>
          <div className="popover-content">
            <FormGroup>
              <Checkbox onChange={this.handleToggleScheme}
                        checked={tableSchemePreviews} >
                Show schemes images
              </Checkbox>
            </FormGroup>
            <FormGroup>
              <Checkbox onChange={this.handleToggleSampleExt}
                        checked={showSampleExternalName} >
                Show sample external name on title
              </Checkbox>
            </FormGroup>
          </div>
        </div>
      )
    }

    let popoverSettings = (
      <Popover  className="collection-overlay" id="popover-layout"
          style={{maxWidth: "none", width: "335px"}}>
        <div>
          <h3 className="popover-title">Table Layout</h3>
          <div className="popover-content">
            <TabLayoutContainer visible={visible} hidden={hidden}
              ref="layout" />
          </div>
        </div>
        {sampleSettings}
      </Popover>
    )

    return (
      <OverlayTrigger trigger="click" placement="left"
        overlay={popoverSettings} rootClose onExit={this.handleOnExit}
      >
        <Button bsSize="xsmall" 
                style={{margin: "10px 10px 10px 0", float: "right"}}>
          <i className="fa fa-sliders"></i>
        </Button>
      </OverlayTrigger>
    )
  }
}

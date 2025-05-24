
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Tabs, Tab, OverlayTrigger, Tooltip, Button } from 'react-bootstrap';
import ForwardActions from 'src/stores/alt/actions/ForwardActions';
import ForwardStore from 'src/stores/alt/stores/ForwardStore';


import PanelHeader from 'src/components/common/PanelHeader';

import { CloseBtn, ResetBtn } from './ForwardComponent';

import RetroContainer from './RetroContainer';
import TemplateContainer from './TemplateContainer';
import ForwardContainer from './ForwardContainer';
import ImpurityContainer from './ImpurityContainer';


class MlContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
     activeKey : 0
    };
    this.onChange = this.onChange.bind(this);
    this.panelHeader = this.panelHeader.bind(this);
    this.selectTab = this.selectTab.bind(this);
  }

  componentDidMount() {

  }

  // componentWillUnmount() {
  //   ForwardStore.unlisten(this.onChange);
  //   UIStore.unlisten(this.onChangeUI);
  // }

  onChange(state) {
    this.setState({ ...state });
  }


  panelHeader() {
    const { prediction } = this.props;
    const btns = [
      <CloseBtn key="closeBtn" el={prediction} />,
      <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="tip_fullscreen_btn">FullScreen</Tooltip>}
        >
          <Button
            bsStyle="info"
            bsSize="xsmall"
            className="button-right"
            onClick={() => this.props.toggleFullScreen()}
          >
            <i className="fa fa-expand" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      // <ResetBtn key="resetBtn" />,
    ];
    return <PanelHeader title="Machine learning for Chemistry" btns={btns} />;
  }

  selectTab(key) { // eslint-disable-line class-methods-use-this
    this.setState({ activeKey : key });
  }

  render() {


    return (
      <Panel
        bsStyle="default"
      >
        <Panel.Heading>{this.panelHeader()}</Panel.Heading>
        <Tabs
          activeKey={this.state.activeKey}
          onSelect={this.selectTab}
          id="askcos-tabs"
        >
          <Tab eventKey={0} title="Forward Synthesis">
            <div title="Perform single step forward synthesis with reactants, reagents and solvents">
              <ForwardContainer width={100} height={100} />
            </div>
          </Tab>
          <Tab className= "tab-content-wrapper" eventKey={1} title="Retro Synthesis">
            <div title="Perform directed retrosynthesis tree search to find precursors">
              <RetroContainer width={100} height={100} />
            </div>
          </Tab>
          {/* <Tab className= "tab-content-wrapper" eventKey={2} title="Reaction Template">
            <div title="Search reaction template in reaxys database with template ID">
              <TemplateContainer width={100} height={100} />
            </div>
          </Tab> */}
          <Tab eventKey={2} title="Impurity Prediction">
            <div title="Predict possible impurities that may arise from reaction">
            <ImpurityContainer width={100} height={100} />
            </div>
          </Tab>
        </Tabs>
      </Panel>
    );
  }
}

MlContainer.propTypes = {
  prediction: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  toggleFullScreen: PropTypes.func,
};

export default MlContainer;

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Tabs, Tab } from 'react-bootstrap';
import PredictionActions from '../actions/PredictionActions';
import PredictionStore from '../stores/PredictionStore';
import UIStore from '../stores/UIStore';

import Content from './Content';
import PanelHeader from '../common/PanelHeader';
import { CloseBtn, ResetBtn, PredictBtn } from './PredictionComponent';

class PredictionContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...PredictionStore.getState(),
    };
    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);
    this.panelHeader = this.panelHeader.bind(this);
  }

  componentDidMount() {
    PredictionStore.listen(this.onChange);
    UIStore.listen(this.onChangeUI);
    const uiState = UIStore.getState();
    this.onChangeUI(uiState);
  }

  componentWillUnmount() {
    PredictionStore.unlisten(this.onChange);
    UIStore.unlisten(this.onChangeUI);
  }

  onChange(state) {
    this.setState({ ...state });
  }

  onChangeUI(uiState) {
    const combState = { uiState, predictionState: this.state };
    PredictionActions.updateUI.defer(combState);
  }

  panelHeader() {
    const { prediction } = this.props;
    const { inputEls, template } = this.state;
    const btns = [
      <CloseBtn key="closeBtn" el={prediction} />,
      <PredictBtn
        key="predictBtn"
        inputEls={inputEls}
        template={template}
      />,
      <ResetBtn key="resetBtn" />,
    ];
    return <PanelHeader title="Synthesis Prediction" btns={btns} />;
  }

  selectTab(key) { // eslint-disable-line class-methods-use-this
    PredictionActions.updateActiveKey(key);
  }

  render() {
    const {
      activeKey, template, inputEls, defaultEls, outputEls,
    } = this.state;

    const els = (defaultEls && inputEls) ? [...defaultEls, ...inputEls] : [];

    return (
      <Panel
        bsStyle="default"
      >
        <Panel.Heading>{this.panelHeader()}</Panel.Heading>
        <Tabs
          activeKey={activeKey}
          onSelect={this.selectTab}
          id="prediction-tabs"
        >
          <Tab eventKey={0} title="Content">
            <Content
              template={template}
              els={els}
              outputEls={outputEls}
            />
          </Tab>
        </Tabs>
      </Panel>
    );
  }
}

PredictionContainer.propTypes = {
  prediction: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default PredictionContainer;

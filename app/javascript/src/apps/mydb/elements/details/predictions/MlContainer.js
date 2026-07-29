
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tabs, Tab } from 'react-bootstrap';

import DetailActions from 'src/stores/alt/actions/DetailActions';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import { detailHeaderButton } from 'src/apps/mydb/elements/details/DetailCardButton';

import RetroContainer from './RetroContainer';
import TemplateContainer from './TemplateContainer';
import ForwardContainer from './ForwardContainer';
import ImpurityContainer from './ImpurityContainer';

class MlContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeKey: 'forward',
      fullScreen: false,
    };
    this.selectTab = this.selectTab.bind(this);
    this.onClose = this.onClose.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);
  }

  onClose() {
    const { prediction } = this.props;
    DetailActions.close(prediction, true);
  }

  toggleFullScreen() {
    this.setState((prevState) => ({ fullScreen: !prevState.fullScreen }));
  }

  selectTab(key) {
    this.setState({ activeKey: key });
  }

  render() {
    const { activeKey, fullScreen } = this.state;

    const headerToolbar = detailHeaderButton({
      label: fullScreen ? 'Exit full screen' : 'Full screen',
      iconClass: fullScreen ? 'fa fa-compress' : 'fa fa-expand',
      variant: 'info',
      onClick: this.toggleFullScreen,
    });

    return (
      <DetailCard
        titleIcon={<i className="fa fa-percent" />}
        title="Machine learning for Chemistry"
        onClose={this.onClose}
        headerToolbar={headerToolbar}
        className={`ml-container${fullScreen ? ' ml-container--fullscreen' : ''}`}
      >
        <Tabs
          activeKey={activeKey}
          onSelect={this.selectTab}
          id="askcos-tabs"
        >
          <Tab eventKey="forward" title="Forward Synthesis">
            <div title="Perform single step forward synthesis with reactants, reagents and solvents">
              <ForwardContainer width={100} height={100} />
            </div>
          </Tab>
          <Tab className="tab-content-wrapper" eventKey="retro" title="Retro Synthesis">
            <div title="Perform directed retrosynthesis tree search to find precursors">
              <RetroContainer width={100} height={100} />
            </div>
          </Tab>
          {/* <Tab className="tab-content-wrapper" eventKey="template" title="Reaction Template">
            <div title="Search reaction template in reaxys database with template ID">
              <TemplateContainer width={100} height={100} />
            </div>
          </Tab> */}
          <Tab eventKey="impurity" title="Impurity Prediction">
            <div title="Predict possible impurities that may arise from reaction">
              <ImpurityContainer width={100} height={100} />
            </div>
          </Tab>
        </Tabs>
      </DetailCard>
    );
  }
}

MlContainer.propTypes = {
  prediction: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default MlContainer;

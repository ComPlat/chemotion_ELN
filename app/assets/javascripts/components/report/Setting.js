import React from 'react';
import { Panel } from 'react-bootstrap';
import ReportActions from '../actions/ReportActions';
import CheckBoxs from '../common/CheckBoxs';

const toggleSplSettings = (text, checked) => {
  ReportActions.updateSplSettings({ text, checked });
};

const toggleSplSettingsAll = () => {
  ReportActions.toggleSplSettingsCheckAll();
};

const toggleRxnSettings = (text, checked) => {
  ReportActions.updateRxnSettings({ text, checked });
};

const toggleRxnSettingsAll = () => {
  ReportActions.toggleRxnSettingsCheckAll();
};

const stdSetting = ({ splSettings, checkedAllSplSettings, rxnSettings,
  checkedAllRxnSettings }) => (
  <div>
    <Panel header="Sample" bsStyle="default">
      <CheckBoxs
        items={splSettings}
        toggleCheckbox={toggleSplSettings}
        toggleCheckAll={toggleSplSettingsAll}
        checkedAll={checkedAllSplSettings}
      />
    </Panel>
    <Panel header="Reaction" bsStyle="default">
      <CheckBoxs
        items={rxnSettings}
        checkedAll={checkedAllRxnSettings}
        toggleCheckbox={toggleRxnSettings}
        toggleCheckAll={toggleRxnSettingsAll}
      />
    </Panel>
  </div>
);

const toggleSiRxnSettings = (text, checked) => {
  ReportActions.updateSiRxnSettings({ text, checked });
};

const toggleSiRxnSettingsAll = () => {
  ReportActions.toggleSiRxnSettingsCheckAll();
};

const suiSetting = ({ siRxnSettings, checkedAllSiRxnSettings }) => (
  <div>
    <Panel header="Synthesis Products Information" bsStyle="default">
      <CheckBoxs
        items={siRxnSettings}
        checkedAll={checkedAllSiRxnSettings}
        toggleCheckbox={toggleSiRxnSettings}
        toggleCheckAll={toggleSiRxnSettingsAll}
      />
    </Panel>
  </div>
);

const spcSetting = () => (
  <div>
    <h5>Not applicable.</h5>
  </div>
);

const rxlSetting = () => (
  <div>
    <h5>Not applicable.</h5>
  </div>
);

const Setting = (props) => {
  switch (props.template) {
    case 'standard':
      return stdSetting(props);
    case 'spectrum':
      return spcSetting();
    case 'supporting_information':
      return suiSetting(props);
    case 'rxn_list':
      return rxlSetting(props);
    default:
      return null;
  }
};

export default Setting;

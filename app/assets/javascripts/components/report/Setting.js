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

const siSetting = ({ siRxnSettings, checkedAllSiRxnSettings }) => (
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

const Setting = (props) => (
  props.template === 'supporting_information'
    ? siSetting(props)
    : stdSetting(props)
);

export default Setting;

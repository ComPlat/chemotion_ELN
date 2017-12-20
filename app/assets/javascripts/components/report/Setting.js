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

const Setting = ({ splSettings, checkedAllSplSettings, rxnSettings,
  checkedAllRxnSettings, template }) => (
  template === 'supporting_information'
    ? <h5>Supporting Infomation has predefined settings.</h5>
    : <div>
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
          toggleCheckbox={toggleRxnSettings}
          toggleCheckAll={toggleRxnSettingsAll}
          checkedAll={checkedAllRxnSettings}
        />
      </Panel>
    </div>
);

export default Setting;

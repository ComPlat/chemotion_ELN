import React from 'react';
import { Panel } from 'react-bootstrap';
import CheckBoxs from '../common/CheckBoxs';

const Setting = ({splSettings, toggleSplSettings, toggleSplSettingsAll,
                  checkedAllSplSettings, rxnSettings, toggleRxnSettings,
                  toggleRxnSettingsAll, checkedAllRxnSettings, template}) => {
  return (
    template === "supporting_information"
      ? <h5>Supporting Infomation has predefined settings.</h5>
      : <div>
          <Panel header="Sample"
                  bsStyle="default">
            <CheckBoxs  items={splSettings}
                        toggleCheckbox={toggleSplSettings}
                        toggleCheckAll={toggleSplSettingsAll}
                        checkedAll={checkedAllSplSettings} />
          </Panel>
          <Panel header="Reaction"
                  bsStyle="default">
            <CheckBoxs  items={rxnSettings}
                        toggleCheckbox={toggleRxnSettings}
                        toggleCheckAll={toggleRxnSettingsAll}
                        checkedAll={checkedAllRxnSettings} />
          </Panel>
        </div>
  );
}

export default Setting;

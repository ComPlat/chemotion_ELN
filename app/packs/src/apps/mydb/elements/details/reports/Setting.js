import React from 'react';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import CheckBoxs from 'src/components/common/CheckBoxs';
import Panel from 'src/components/legacyBootstrap/Panel'

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
    <Panel variant="light">
      <Panel.Heading>
        <Panel.Title>
          Sample
        </Panel.Title>
      </Panel.Heading>
      <Panel.Body>
        <CheckBoxs
          items={splSettings}
          toggleCheckbox={toggleSplSettings}
          toggleCheckAll={toggleSplSettingsAll}
          checkedAll={checkedAllSplSettings}
        />
      </Panel.Body>
    </Panel>
    <Panel variant="light">
      <Panel.Heading>
        <Panel.Title>
          Reaction
        </Panel.Title>
      </Panel.Heading>
      <Panel.Body>
        <CheckBoxs
          items={rxnSettings}
          checkedAll={checkedAllRxnSettings}
          toggleCheckbox={toggleRxnSettings}
          toggleCheckAll={toggleRxnSettingsAll}
        />
      </Panel.Body>
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
    <Panel variant="light">
      <Panel.Heading>
        <Panel.Title>
          Synthesis Products Information
        </Panel.Title>
      </Panel.Heading>
      <Panel.Body>
        <CheckBoxs
          items={siRxnSettings}
          checkedAll={checkedAllSiRxnSettings}
          toggleCheckbox={toggleSiRxnSettings}
          toggleCheckAll={toggleSiRxnSettingsAll}
        />
      </Panel.Body>
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
  switch (props.template.value) {
    case 'standard':
      return stdSetting(props);
    case 'spectrum':
      return spcSetting();
    case 'supporting_information':
    case 'supporting_information_std_rxn':
      return suiSetting(props);
    case 'rxn_list_xlsx':
    case 'rxn_list_csv':
    case 'rxn_list_html':
      return rxlSetting(props);
    default:
      return stdSetting(props);
  }
};

export default Setting;

import React from 'react';
import { Card } from 'react-bootstrap'
import ReportActions from 'src/stores/alt/actions/ReportActions';
import CheckBoxList from 'src/components/common/CheckBoxList';

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
  <div className="d-flex flex-column gap-3">
    <Card>
      <Card.Header>
        Sample
      </Card.Header>
      <Card.Body>
        <CheckBoxList
          items={splSettings}
          toggleCheckbox={toggleSplSettings}
          toggleCheckAll={toggleSplSettingsAll}
          checkedAll={checkedAllSplSettings}
        />
      </Card.Body>
    </Card>

    <Card>
      <Card.Header>
        Reaction
      </Card.Header>
      <Card.Body>
        <CheckBoxList
          items={rxnSettings}
          checkedAll={checkedAllRxnSettings}
          toggleCheckbox={toggleRxnSettings}
          toggleCheckAll={toggleRxnSettingsAll}
        />
      </Card.Body>
    </Card>
  </div>
);

const toggleSiRxnSettings = (text, checked) => {
  ReportActions.updateSiRxnSettings({ text, checked });
};

const toggleSiRxnSettingsAll = () => {
  ReportActions.toggleSiRxnSettingsCheckAll();
};

const suiSetting = ({ siRxnSettings, checkedAllSiRxnSettings }) => (
  <Card variant="light">
    <Card.Header>
      Synthesis Products Information
    </Card.Header>
    <Card.Body>
      <CheckBoxList
        items={siRxnSettings}
        checkedAll={checkedAllSiRxnSettings}
        toggleCheckbox={toggleSiRxnSettings}
        toggleCheckAll={toggleSiRxnSettingsAll}
      />
    </Card.Body>
  </Card>
);

const notApplicable = () => (
  <div>
    <h5>Not applicable.</h5>
  </div>
);

const Setting = (props) => {
  switch (props.template.value) {
    case 'standard':
      return stdSetting(props);
    case 'supporting_information':
    case 'supporting_information_std_rxn':
      return suiSetting(props);
    case 'spectrum':
    case 'rxn_list_xlsx':
    case 'rxn_list_csv':
    case 'rxn_list_html':
      return notApplicable(props);
    default:
      return stdSetting(props);
  }
};

export default Setting;

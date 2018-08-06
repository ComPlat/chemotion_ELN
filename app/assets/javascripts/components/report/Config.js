import React from 'react';
import Select from 'react-select';
import { FormGroup, OverlayTrigger, ControlLabel, FormControl, Tooltip,
  Row, Col } from 'react-bootstrap';
import ReportActions from '../actions/ReportActions';
import CheckBoxs from '../common/CheckBoxs';

const imgFormatOpts = () => (
  [
    { label: 'PNG', value: 'png' },
    { label: 'EPS', value: 'eps' },
    { label: 'EMF', value: 'emf' },
  ]
);

const templateOpts = () => (
  [
    { label: 'Standard', value: 'standard' },
    { label: 'Supporting Information', value: 'supporting_information' },
    { label: 'Supporting Information - Spectra', value: 'spectrum' },
    { label: 'Supporting Information - Reaction List (.xlsx)', value: 'rxn_list_xlsx' },
    { label: 'Supporting Information - Reaction List (.csv)', value: 'rxn_list_csv' },
    { label: 'Supporting Information - Reaction List (.html)', value: 'rxn_list_html' },
  ]
);

const EpsWarning = ({ imgFormat }) => (
  imgFormat === 'eps'
    ? <p className="text-danger" style={{ paddingTop: 12 }}>
      WARNING: EPS format is not supported by Microsoft Office
    </p>
    : null
);

const onImgFormatChange = (e) => {
  ReportActions.updateImgFormat(e.value);
};

const ImgFormat = ({ imgFormat }) => (
  <Row>
    <Col md={3} sm={8}>
      <label>Images format</label>
      <Select
        options={imgFormatOpts()}
        value={imgFormat}
        clearable={false}
        style={{ width: 100 }}
        onChange={onImgFormatChange}
      />
    </Col>
    <Col md={9} sm={16}>
      <label />
      <EpsWarning imgFormat={imgFormat} />
    </Col>
  </Row>
);

const FileDescription = ({ fileDescription }) => (
  <FormGroup>
    <ControlLabel>File description</ControlLabel>
    <FormControl
      componentClass="textarea"
      onChange={ReportActions.updateFileDescription}
      rows={2}
      value={fileDescription}
    />
  </FormGroup>
);

const fileNameRule = () => (
  <Tooltip id="file-name-rule" >
    <p>Max 40 characters.</p>
    <p>allowed: a to z, A to Z, 0 to 9, -, _</p>
  </Tooltip>
);

const FileName = ({ fileName }) => (
  <FormGroup>
    <OverlayTrigger overlay={fileNameRule()}>
      <ControlLabel>
        File Name
      </ControlLabel>
    </OverlayTrigger>
    <FormControl
      type="text"
      value={fileName}
      onChange={ReportActions.updateFileName}
    />
  </FormGroup>
);

const onTemplateChange = (e) => {
  ReportActions.updateTemplate(e.value);
};

const Template = ({ template }) => (
  <Row>
    <Col md={6} sm={12}>
      <label>Template Selection</label>
      <Select
        options={templateOpts()}
        value={template}
        clearable={false}
        onChange={onTemplateChange}
      />
    </Col>
    <Col md={6} sm={12} />
  </Row>
);

const toggleConfigs = (text, checked) => {
  ReportActions.updateConfigs({ text, checked });
};

const toggleConfigsAll = () => {
  ReportActions.toggleConfigsCheckAll();
};

const suiConfig = ({ template, configs, fileName, checkedAllConfigs,
  fileDescription }) => {

  const filteredConfigs = configs.filter(c => c.text === 'Show all chemicals in schemes (unchecked to show products only)');
  return (
    <div>
      <br />
      <Template template={template} />
      <br />
      <FileName fileName={fileName} />
      <FileDescription fileDescription={fileDescription} />
      <CheckBoxs
        items={filteredConfigs}
        toggleCheckbox={toggleConfigs}
        toggleCheckAll={toggleConfigsAll}
        checkedAll={checkedAllConfigs}
      />
    </div>
  );
};

const stdConfig = ({template, configs, fileName, checkedAllConfigs,
  imgFormat, fileDescription }) => {
  return (
    <div>
      <br />
      <Template template={template} />
      <br />
      <FileName fileName={fileName} />
      <FileDescription fileDescription={fileDescription} />
      <CheckBoxs
        items={configs}
        toggleCheckbox={toggleConfigs}
        toggleCheckAll={toggleConfigsAll}
        checkedAll={checkedAllConfigs}
      />
      <ImgFormat imgFormat={imgFormat} />
    </div>
  );
};

const spcConfig = ({ template, fileName, fileDescription }) => {
  return (
    <div>
      <br />
      <Template template={template} />
      <br />
      <FileName fileName={fileName} />
      <FileDescription fileDescription={fileDescription} />
    </div>
  );
};

const rxlConfig = props => spcConfig(props);

const Config = (props) => {
  switch (props.template) {
    case 'standard':
      return stdConfig(props);
    case 'spectrum':
      return spcConfig(props);
    case 'supporting_information':
      return suiConfig(props);
    case 'rxn_list_xlsx':
    case 'rxn_list_csv':
    case 'rxn_list_html':
      return rxlConfig(props);
    default:
      return null;
  }
};

export default Config;

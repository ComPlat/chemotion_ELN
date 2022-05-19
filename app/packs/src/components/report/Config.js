import React from 'react';
import Select from 'react-select';
import {
  FormGroup, OverlayTrigger, ControlLabel, FormControl, Tooltip,
  Row, Col
} from 'react-bootstrap';
import ReportActions from '../actions/ReportActions';
import CheckBoxs from '../common/CheckBoxs';

const imgFormatOpts = () => (
  [
    { label: 'PNG', value: 'png' },
    { label: 'EPS', value: 'eps' },
    { label: 'EMF', value: 'emf' },
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
  <Row style={{ paddingBottom: 100 }} >
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
  ReportActions.updateTemplate(e);
};

function TemplateRender(template, options) {
  const templateOpts = options.map(item => ({ id: item.id, label: item.name, value: item.report_type }));

  return (
    <Row>
      <Col md={6} sm={12}>
        <label>Template Selection</label>
        <Select
          options={templateOpts}
          value={template}
          clearable={false}
          onChange={onTemplateChange}
        />
      </Col>
      <Col md={6} sm={12} />
    </Row>
  );
}

const toggleConfigs = (text, checked) => {
  ReportActions.updateConfigs({ text, checked });
};

const toggleConfigsAll = () => {
  ReportActions.toggleConfigsCheckAll();
};

const suiConfig = ({ template, configs, fileName, checkedAllConfigs,
  fileDescription, options }) => {

  const filteredConfigs = configs.filter(c => c.text === 'Show all chemicals in schemes (unchecked to show products only)');
  return (
    <div>
      <br />
      {TemplateRender(template, options)}
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

const suiStdRxnConfig = ({
  template, configs, fileName, checkedAllConfigs, fileDescription, options
}) => {
  const filteredConfigs = configs.filter(c => c.text === 'Show all chemicals in schemes (unchecked to show products only)');
  return (
    <div>
      <br />
      {TemplateRender(template, options)}
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

const stdConfig = ({
  template,
  configs,
  fileName,
  checkedAllConfigs,
  imgFormat,
  fileDescription,
  options
}) => (
  <div>
    <br />
    {TemplateRender(template, options)}
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

const spcConfig = ({
  template,
  fileName,
  fileDescription,
  options
}) => (
  <div>
    <br />
    {TemplateRender(template, options)}
    <br />
    <FileName fileName={fileName} />
    <FileDescription fileDescription={fileDescription} />
  </div>
);

const rxlConfig = props => spcConfig(props);

const Config = (props) => {
  switch (props.template.value) {
    case 'standard':
      return stdConfig(props);
    case 'spectrum':
      return spcConfig(props);
    case 'supporting_information':
      return suiConfig(props);
    case 'supporting_information_std_rxn':
      return suiStdRxnConfig(props);
    case 'rxn_list_xlsx':
    case 'rxn_list_csv':
    case 'rxn_list_html':
      return rxlConfig(props);
    default:
      return stdConfig(props);
  }
};

export default Config;

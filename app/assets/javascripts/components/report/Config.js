import React from 'react';
import Select from 'react-select';
import { FormGroup, OverlayTrigger, ControlLabel, FormControl,
          Row, Col } from 'react-bootstrap';
import ReportActions from '../actions/ReportActions';
import CheckBoxs from '../common/CheckBoxs';
import Immutable from 'immutable';

const imgFormatOpts = () => {
  return (
    [
      { label: 'PNG', value: 'png'},
      { label: 'EPS', value: 'eps'},
      { label: 'EMF', value: 'emf'}
    ]
  );
}

const templateOpts = () => {
  return (
    [
      { label: 'Standard', value: 'standard'},
      { label: 'Supporting Information', value: 'supporting_information'},
    ]
  );
}

const EpsWarning = ({imgFormat}) => {
  return (
    imgFormat == 'eps'
      ? <p className="text-danger" style={{paddingTop: 12}}>
          WARNING: EPS format is not supported by Microsoft Office
        </p>
      : null
  );
}

const ImgFormat = ({imgFormat, handleImgFormatChanged}) => {
  return (
    <Row>
      <Col md={3} sm={8}>
        <label>Images format</label>
        <Select options={imgFormatOpts()}
                value={imgFormat}
                clearable={false}
                style={{width: 100}}
                onChange={handleImgFormatChanged}/>
      </Col>
      <Col md={9} sm={16}>
        <label></label>
        <EpsWarning imgFormat={imgFormat} />
      </Col>
    </Row>
  );
}

const FileDescription = () => {
  return (
    <FormGroup>
      <ControlLabel>File description</ControlLabel>
      <FormControl componentClass="textarea"
       onChange={ReportActions.updateFileDescription}
       rows={2}
      />
    </FormGroup>
  );
}

const FileName = ({fileNameRule, fileName}) => {
  return (
    <FormGroup>
      <OverlayTrigger overlay={fileNameRule()}>
        <ControlLabel>
          File Name
        </ControlLabel>
      </OverlayTrigger>
      <FormControl type="text"
        value={fileName}
        onChange={ReportActions.updateFileName}
      />
    </FormGroup>
  );
}

const Template = ({template, handleTemplateChanged}) => {
  return (
    <Row>
      <Col md={6} sm={12}>
        <label>Template Selection</label>
        <Select options={templateOpts()}
                value={template}
                clearable={false}
                onChange={handleTemplateChanged}/>
      </Col>
      <Col md={6} sm={12} />
    </Row>
  );
}

const SiConfig = ({template, configs, fileName, checkedAllConfigs,
        fileNameRule, toggleConfigs, toggleConfigsAll,
        handleTemplateChanged}) => {

  const filteredConfigs = configs.filter(c => c.text === "Show all chemicals in schemes (unchecked to show products only)");
  return (
    <div>
      <br/>
      <Template template={template}
                  handleTemplateChanged={handleTemplateChanged}/>
      <br/>
      <FileName fileNameRule={fileNameRule} fileName={fileName} />
      <FileDescription />
      <CheckBoxs  items={filteredConfigs}
                  toggleCheckbox={toggleConfigs}
                  toggleCheckAll={toggleConfigsAll}
                  checkedAll={checkedAllConfigs} />
    </div>
  );
}

const GeneralConfig = ({template, configs, fileName, checkedAllConfigs,
        fileNameRule, toggleConfigs, toggleConfigsAll,
        handleTemplateChanged, imgFormat, handleImgFormatChanged}) => {
  return (
    <div>
      <br/>
      <Template template={template}
                  handleTemplateChanged={handleTemplateChanged}/>
      <br/>
      <FileName fileNameRule={fileNameRule} fileName={fileName} />
      <FileDescription />
      <CheckBoxs  items={configs}
                  toggleCheckbox={toggleConfigs}
                  toggleCheckAll={toggleConfigsAll}
                  checkedAll={checkedAllConfigs} />
      <ImgFormat imgFormat={imgFormat}
                  handleImgFormatChanged={handleImgFormatChanged} />
    </div>
  );
}

const Config = ({imgFormat, configs, fileName, checkedAllConfigs, fileNameRule,
          toggleConfigs, toggleConfigsAll, handleImgFormatChanged, template,
          handleTemplateChanged}) => {
  return (
    template === "supporting_information"
      ? <SiConfig
          configs={configs}
          fileName={fileName}
          checkedAllConfigs={checkedAllConfigs}
          fileNameRule={fileNameRule}
          toggleConfigs={toggleConfigs}
          toggleConfigsAll={toggleConfigsAll}
          template={template}
          handleTemplateChanged={handleTemplateChanged}
        />
      : <GeneralConfig
          imgFormat={imgFormat}
          configs={configs}
          fileName={fileName}
          checkedAllConfigs={checkedAllConfigs}
          fileNameRule={fileNameRule}
          toggleConfigs={toggleConfigs}
          toggleConfigsAll={toggleConfigsAll}
          handleImgFormatChanged={handleImgFormatChanged}
          template={template}
          handleTemplateChanged={handleTemplateChanged}
        />
  );
}

export default Config;

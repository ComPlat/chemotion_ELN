import React from 'react';
import Select from 'react-select';
import { FormGroup, OverlayTrigger, ControlLabel, FormControl,
          Row, Col } from 'react-bootstrap';
import ReportActions from '../actions/ReportActions';
import CheckBoxs from '../common/CheckBoxs';

const imgFormatOpts = () => {
  return (
    [
      { label: 'PNG', value: 'png'},
      { label: 'EPS', value: 'eps'},
      { label: 'EMF', value: 'emf'}
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

const Config = ({ imgFormat, configs, fileName, checkedAllConfigs, fileNameRule,
  toggleConfigs, toggleConfigsAll, handleImgFormatChanged }) => {

  return (
    <div>
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

export default Config;

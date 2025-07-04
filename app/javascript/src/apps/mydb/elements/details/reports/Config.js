import React from 'react';
import { Select } from 'src/components/common/Select';
import {
  Form, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import CheckBoxList from 'src/components/common/CheckBoxList';

const imgFormatOpts = [
  { label: 'PNG', value: 'png' },
  { label: 'EPS', value: 'eps' },
  { label: 'EMF', value: 'emf' },
];

const onImgFormatChange = (e) => {
  ReportActions.updateImgFormat(e.value);
};

const ImgFormat = ({ imgFormat }) => (
  // Add mb-5 to prevent Select options being hidden
  <Form.Group className="mb-5">
    <Form.Label>Images format</Form.Label>
    <Select
      options={imgFormatOpts}
      value={imgFormatOpts.find(({value}) => value == imgFormat)}
      isClearable={false}
      onChange={onImgFormatChange}
    />
    {imgFormat === 'eps' && (
      <Form.Text>
        <span className="text-danger">
          WARNING: EPS format is not supported by Microsoft Office
        </span>
      </Form.Text>
    )}
  </Form.Group>
);

const onTemplateChange = (e) => {
  ReportActions.updateTemplate(e.value);
};

const toggleConfigs = (text, checked) => {
  ReportActions.updateConfigs({ text, checked });
};

const toggleConfigsAll = () => {
  ReportActions.toggleConfigsCheckAll();
};

const filteredConfigCheckboxes = ({ configs, checkedAllConfigs }) => {
  const filteredConfigs = configs.filter(c =>
    c.text === 'Show all chemicals in schemes (unchecked to show products only)'
  );

  return (
    <CheckBoxList
      items={filteredConfigs}
      toggleCheckbox={toggleConfigs}
      toggleCheckAll={toggleConfigsAll}
      checkedAll={checkedAllConfigs}
    />
  );
};

const stdConfig = ({ configs, checkedAllConfigs, imgFormat, }) => (
  <>
    <CheckBoxList
      items={configs}
      toggleCheckbox={toggleConfigs}
      toggleCheckAll={toggleConfigsAll}
      checkedAll={checkedAllConfigs}
    />
    <ImgFormat imgFormat={imgFormat} />
  </>
);

const additionalFields = (props) => {
  switch (props.template.value) {
    case 'spectrum':
    case 'rxn_list_xlsx':
    case 'rxn_list_csv':
    case 'rxn_list_html':
      return null
    case 'supporting_information':
    case 'supporting_information_std_rxn':
      return filteredConfigCheckboxes(props);
    case 'standard':
    default:
      return stdConfig(props);
  }
};

const Config = (props) => {
  const { template, options, fileName, fileDescription } = props;

  const templateOpts = options.map(item => (
    { id: item.id, label: item.name, value: item.id }
  ));

  return (
    <div className="d-flex flex-column gap-3">
      <Form.Group>
        <Form.Label> Template selection</Form.Label>
        <Select
          options={templateOpts}
          value={template}
          isClearable={false}
          onChange={onTemplateChange}
        />
      </Form.Group>

      <Form.Group>
        <OverlayTrigger
          overlay={
            <Tooltip id="file-name-rule" >
              <div>Max 40 characters.</div>
              <div>allowed: a to z, A to Z, 0 to 9, -, _</div>
            </Tooltip>
          }
        >
          <Form.Label>
            File name
          </Form.Label>
        </OverlayTrigger>
        <Form.Control
          type="text"
          value={fileName}
          onChange={ReportActions.updateFileName}
        />
      </Form.Group>

      <Form.Group>
        <Form.Label>File description</Form.Label>
        <Form.Control
          as="textarea"
          onChange={ReportActions.updateFileDescription}
          rows={2}
          value={fileDescription}
        />
      </Form.Group>

      {additionalFields(props)}
    </div>
  )
}

export default Config;

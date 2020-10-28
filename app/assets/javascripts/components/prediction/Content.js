import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { Row, Col } from 'react-bootstrap';
import UIActions from '../actions/UIActions';
import PredictionActions from '../actions/PredictionActions';
import ContentInputs from './ContentInputs';
import ContentOutputs from './ContentOutputs';

const styles = {
  selectContainer: {
    height: 50,
  },
};

const templateOpts = () => (
  [
    { label: 'Predict Products', value: 'predictProducts' },
    { label: 'Predict Starting Materials', value: 'predictReactants' },
  ]
);

const onTemplateChange = (e) => {
  PredictionActions.updateTemplate(e.value);
  UIActions.uncheckWholeSelection.defer();
};

const ContentTemplate = template => (
  <Row style={styles.selectContainer}>
    <Col md={6} sm={12}>
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

const Content = ({ template, els, outputEls }) => (
  <div className="report-orders panel-workspace">
    <br />
    { ContentTemplate(template) }
    { ContentInputs(template, els) }
    <br />
    { ContentOutputs(template, outputEls) }
  </div>
);

Content.propTypes = {
  template: PropTypes.string.isRequired,
  els: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  outputEls: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default Content;

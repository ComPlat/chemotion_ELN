import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { Select, CreatableSelect } from 'src/components/common/Select';
import {
  Row, Col, Button, Form, Container, ButtonToolbar
} from 'react-bootstrap';

import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';

import ComputedPropsGraph from 'src/components/computedProps/ComputedPropsGraph';
import GraphReferenceTable from 'src/components/computedProps/GraphReferenceTable';

const etlReferences = [
  { x: -1.8, y: 50, type: 'reference' },
  { x: -1.8, y: 90, type: 'reference' },
  { x: -2.2, y: 50, type: 'reference' },
  { x: -2.0, y: 10, type: 'reference' },
  { x: -1.6, y: 10, type: 'reference' },
  { x: -1.4, y: 50, type: 'reference' }
];

const defaultTemplate = {
  name: 'Default',
  xAxisType: 'lumo',
  yAxisType: 'mean_abs_potential',
  referenceDesc: 'Compounds are interesting as material for the ' +
    'Electron Transport Layer (ETL)',
  referencePoints: etlReferences,
};

const graphSettings = {
  mean_abs_potential: { label: 'ESP', unit: 'mV', range: [0, 400] },
  lumo: { label: 'LUMO', unit: 'eV', range: [-7, 2] },
  homo: { label: 'HOMO', unit: 'eV', range: [-12, 0] },
  ip: { label: 'IP', unit: 'eV', range: [2, 10] },
  ea: { label: 'EA', unit: 'eV', range: [-2, 6] },
  dipol_debye: { label: 'Dipol', unit: 'debye', range: [0, 14] },
};

export default class ComputedPropsGraphContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      curTemplateIdx: 0,
      graphTemplates: [],
      templateInputValue: '',
    };

    this.onUserChange = this.onUserChange.bind(this);
    this.onTemplateChange = this.onTemplateChange.bind(this);
    this.onXAxisChange = this.onXAxisChange.bind(this);
    this.onYAxisChange = this.onYAxisChange.bind(this);

    this.updateReferences = this.updateReferences.bind(this);
    this.saveTemplate = this.saveTemplate.bind(this);
    this.deleteTemplate = this.deleteTemplate.bind(this);
    this.onDescChange = this.onDescChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange);
    this.onUserChange(UserStore.getState());
  }

  componentDidUpdate(prevProps, prevState) {
  // Sync templateInputValue when template changes
  const { curTemplateIdx, graphTemplates } = this.state;
  const currentTemplate = graphTemplates[curTemplateIdx];
  const prevTemplate = prevState.graphTemplates[prevState.curTemplateIdx];

  if (currentTemplate?.name !== prevTemplate?.name) {
    this.setState({
      templateInputValue: currentTemplate?.name || ''
    });
  }
}

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange);
  }

  onUserChange(userState) {
    const profileData = _.get(userState, 'profile.data', {});
    const graphTemplates = _.get(
      profileData,
      'computed_props.graph_templates',
      [defaultTemplate]
    );

    const curTemplateIdx = _.get(profileData, 'computed_props.cur_template_idx', 0);
    const currentTemplate = graphTemplates[curTemplateIdx];

    this.setState({ graphTemplates, curTemplateIdx, templateInputValue: currentTemplate?.name || '' });
  }

  onXAxisChange(xAxis) {
    const { curTemplateIdx, graphTemplates } = this.state;
    const newGraphTemplates = graphTemplates.map((templ, idx) => {
      if (idx === curTemplateIdx) {
        const newTempl = _.cloneDeep(templ);
        newTempl.xAxisType = xAxis.value;
        return newTempl;
      }
      return templ;
    });

    this.setState({ graphTemplates: newGraphTemplates });
  }

  onYAxisChange(yAxis) {
    const { curTemplateIdx, graphTemplates } = this.state;
    const newGraphTemplates = graphTemplates.map((templ, idx) => {
      if (idx === curTemplateIdx) {
        const newTempl = _.cloneDeep(templ);
        newTempl.yAxisType = yAxis.value;
        return newTempl;
      }
      return templ;
    });

    this.setState({ graphTemplates: newGraphTemplates });
  }

  onDescChange(e) {
    const { curTemplateIdx, graphTemplates } = this.state;
    const desc = e.target.value;
    const newGraphTemplates = graphTemplates.map((templ, idx) => {
      if (idx === curTemplateIdx) {
        const newTempl = _.cloneDeep(templ);
        newTempl.referenceDesc = desc;
        return newTempl;
      }
      return templ;
    });

    this.setState({ graphTemplates: newGraphTemplates });
  }

  onTemplateChange(template) {
    if (!template) {
      this.setState({ templateInputValue: '' });
      return;
    }
    const { graphTemplates } = this.state;
    const tIdx = graphTemplates.findIndex(t => t.name === template.label);
    if (tIdx > -1) {
      this.setState({
        curTemplateIdx: tIdx,
        templateInputValue: template.label
      });
    } else {
      const newTempl = {
        name: template.label,
        xAxisType: 'lumo',
        yAxisType: 'mean_abs_potential',
        referenceDesc: '',
        referencePoints: [],
      };

      graphTemplates.push(newTempl);
      this.setState({
        graphTemplates,
        curTemplateIdx: graphTemplates.length - 1,
        templateInputValue: template.label
      });
    }
  }

  updateReferences(refs) {
    const { curTemplateIdx, graphTemplates } = this.state;
    const newGraphTemplates = graphTemplates.map((templ, idx) => {
      if (idx === curTemplateIdx) {
        const newTempl = _.cloneDeep(templ);
        newTempl.referencePoints = refs;
        return newTempl;
      }
      return templ;
    });

    this.setState({ graphTemplates: newGraphTemplates });
  }

  saveTemplate() {
    const userProfile = UserStore.getState().profile;
    const { graphTemplates, curTemplateIdx } = this.state;
    _.set(userProfile, 'data.computed_props.graph_templates', graphTemplates);
    _.set(userProfile, 'data.computed_props.cur_template_idx', curTemplateIdx);
    UserActions.updateUserProfile(userProfile);
  }

  deleteTemplate() {
    const userProfile = UserStore.getState().profile;
    const { graphTemplates } = this.state;
    const { curTemplateIdx } = this.state;
    const newGraphTemplates = _.cloneDeep(graphTemplates);
    newGraphTemplates.splice(curTemplateIdx, 1);
    const newTemplateIdx = curTemplateIdx > 1 ? (curTemplateIdx - 1) : 0;
    _.set(userProfile, 'data.computed_props.graph_templates', newGraphTemplates);
    _.set(userProfile, 'data.computed_props.cur_template_idx', newTemplateIdx);
    UserActions.updateUserProfile(userProfile);
  }

  render() {
    const { show, graphData, style } = this.props;
    if (!show || graphData.length === 0) return <span />;

    const { curTemplateIdx, graphTemplates } = this.state;
    const template = graphTemplates.size === 0 ?
      defaultTemplate :
      graphTemplates[curTemplateIdx];

    const xAxisType = template?.xAxisType || 'lumo';
    const yAxisType = template?.yAxisType || 'mean_abs_potential';
    const xAxis = graphSettings[xAxisType] || graphSettings.lumo;
    const yAxis = graphSettings[yAxisType] || graphSettings.mean_abs_potential;

    const referenceDesc = template?.referenceDesc ?? defaultTemplate.referenceDesc;
    const referencePoints = template?.referencePoints || etlReferences;
    if (referencePoints.length === 0) {
      referencePoints.push({ x: '', y: '', type: 'reference' });
    }

    const data = graphData.filter((dat) => dat.props).map((dat) => ({
      name: dat.name,
      svgPath: dat.svgPath,
      x: _.get(dat, `props.${xAxisType}`, dat.props.lumo),
      y: _.get(dat, `props.${yAxisType}`, dat.props.mean_abs_potential),
    }));

    const axisSelectOptions = Object.keys(graphSettings).map((k) => (
      { label: graphSettings[k].label, value: k }
    ));
    const templateOptions = graphTemplates.map((templ, idx) => (
      { label: templ.name, value: idx }
    ));

    return (
      <Container style={style}>
        <Row>
          <Col xs={18} md={12}>
            <ComputedPropsGraph
              xAxis={xAxis}
              yAxis={yAxis}
              show={show}
              data={data}
              style={style}
              referencePoints={referencePoints}
              referenceDesc={referenceDesc}
            />
          </Col>
        </Row>
        <Row >
          <Col xs={9} md={6} >
            <GraphReferenceTable
              xLabel={xAxis.label}
              yLabel={yAxis.label}
              data={referencePoints}
              updateData={this.updateReferences}
            />
          </Col>
          <Col xs={9} md={6} className="d-flex">
            <Form horizontal className="flex-grow-1 justify-content-end mt-2">
              <Form.Group controlId="formInlineTemplate" className="mb-2">
                <Form.Label column sm={4}>Template</Form.Label>
                <CreatableSelect
                  isClearable
                  isInputEditable
                  inputValue={this.state.templateInputValue}
                  onChange={(selectedOption) => {
                    const value = selectedOption ? selectedOption.label : '';
                    this.setState({ templateInputValue: value });
                    this.onTemplateChange(selectedOption);
                  }}
                  onInputChange={(inputValue, { action }) => {
                    if (action === 'input-change') {
                      this.setState({ templateInputValue: inputValue });
                    }
                  }}
                  value={templateOptions.find(({ value }) => value === curTemplateIdx)}
                  options={templateOptions}
                  placeholder="Select or create template"
                  allowCreateWhileLoading
                  formatCreateLabel={(label) => `Create new '${label}' template`}
                />
              </Form.Group>
              <Form.Group controlId="formInlineXAxis" className="mb-2">
                <Form.Label column sm={4}>X Axis</Form.Label>
                <Select
                  onChange={this.onXAxisChange}
                  value={axisSelectOptions.find(({value}) => value === xAxisType)}
                  options={axisSelectOptions}
                />
              </Form.Group>
              <Form.Group controlId="formInlineYAxis" className="mb-2">
                <Form.Label column sm={4}>Y Axis</Form.Label>
                <Select
                  onChange={this.onYAxisChange}
                  value={axisSelectOptions.find(({value}) => value === yAxisType)}
                  options={axisSelectOptions}
                />
              </Form.Group>
              <Form.Group controlId="formInlineRefDesc" className="mb-2">
                <Form.Label>References Description</Form.Label>
                <Form.Control
                  as="textarea"
                  type="description"
                  placeholder="Description"
                  value={referenceDesc}
                  rows={5}
                  onChange={e => this.onDescChange(e)}
                />
              </Form.Group>
              <ButtonToolbar className="gap-1 mt-2 justify-content-end">
                <Button variant="info" size="sm" onClick={this.saveTemplate}>
                  Save Template
                </Button>
                <Button variant="danger" size="sm" onClick={this.deleteTemplate}>
                  Delete Template
                </Button>
              </ButtonToolbar>
            </Form>
          </Col>
        </Row>
      </Container>
    );
  }
}

ComputedPropsGraphContainer.propTypes = {
  graphData: PropTypes.arrayOf(PropTypes.object).isRequired,
  show: PropTypes.bool.isRequired,
  style: PropTypes.object,
};

ComputedPropsGraphContainer.defaultProps = {
  style: {}
};

import React from 'react';
import _ from 'lodash';

import Select from 'react-select';
import {
  Grid, Row, Col, Button, ControlLabel, Form, FormGroup, FormControl
} from 'react-bootstrap';

import UserStore from '../stores/UserStore';
import UserActions from '../actions/UserActions';

import ComputedPropsGraph from './ComputedPropsGraph';
import GraphReferenceTable from './GraphReferenceTable';

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
  }

  componentWillReceiveProps() {
    this.onUserChange();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange);
  }

  onUserChange() {
    const userState = UserStore.getState();
    const profileData = _.get(userState, 'profile.data', {});
    const graphTemplates = _.get(
      profileData,
      'computed_props.graph_templates',
      [defaultTemplate]
    );

    const curTemplateIdx = _.get(profileData, 'computed_props.cur_template_idx', 0);
    this.setState({ graphTemplates, curTemplateIdx });
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
    const { graphTemplates } = this.state;
    const tIdx = graphTemplates.findIndex(t => t.name === template.label);
    if (tIdx > -1) {
      this.setState({ curTemplateIdx: tIdx });
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
    let { curTemplateIdx } = this.state;
    const newGraphTemplates = _.cloneDeep(graphTemplates);
    newGraphTemplates.splice(curTemplateIdx, 1);
    curTemplateIdx = newGraphTemplates.length;
    console.log(newGraphTemplates);
    _.set(userProfile, 'data.computed_props.graph_templates', newGraphTemplates);
    _.set(userProfile, 'data.computed_props.cur_template_idx', curTemplateIdx);
    UserActions.updateUserProfile(userProfile);
  }

  render() {
    const { show, graphData, style } = this.props;
    if (!show || graphData.length === 0) return <span />;

    const { curTemplateIdx, graphTemplates } = this.state;
    const template = graphTemplates.size === 0 ?
      defaultTemplate :
      graphTemplates[curTemplateIdx];

    const xAxisType = template.xAxisType || 'lumo';
    const yAxisType = template.yAxisType || 'mean_abs_potential';
    const xAxis = graphSettings[xAxisType] || graphSettings.lumo;
    const yAxis = graphSettings[yAxisType] || graphSettings.mean_abs_potential;

    const { referenceDesc } = template;
    const referencePoints = template.referencePoints || etlReferences;
    if (referencePoints.length === 0) {
      referencePoints.push({ x: '', y: '', type: 'reference' });
    }

    const data = graphData.filter(dat => dat.props).map(dat => ({
      name: dat.name,
      x: _.get(dat, `props.${xAxisType}`, dat.props.lumo),
      y: _.get(dat, `props.${yAxisType}`, dat.props.mean_abs_potential),
    }));

    const axisSelectOptions = Object.keys(graphSettings).map(k => (
      { label: graphSettings[k].label, value: k }
    ));
    const templateOptions = graphTemplates.map((templ, idx) => (
      { label: templ.name, value: idx }
    ));

    return (
      <Grid fluid style={style}>
        <Row className="show-grid">
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
        <Row>
          <Col xs={9} md={6}>
            <Form horizontal>
              <FormGroup controlId="formInlineTemplate">
                <Col componentClass={ControlLabel} sm={4}>
                  Template
                </Col>
                <Col sm={8}>
                  <Select.Creatable
                    onChange={this.onTemplateChange}
                    value={curTemplateIdx}
                    options={templateOptions}
                    clearable={false}
                    promptTextCreator={label => `Create new ${label} template`}
                  />
                </Col>
              </FormGroup>
              <FormGroup controlId="formInlineXAxis">
                <Col componentClass={ControlLabel} sm={4}>
                  X Axis
                </Col>
                <Col sm={8}>
                  <Select
                    onChange={this.onXAxisChange}
                    value={xAxisType}
                    clearable={false}
                    options={axisSelectOptions}
                  />
                </Col>
              </FormGroup>
              <FormGroup controlId="formInlineYAxis">
                <Col componentClass={ControlLabel} sm={4}>
                  Y Axis
                </Col>
                <Col sm={8}>
                  <Select
                    onChange={this.onYAxisChange}
                    value={yAxisType}
                    clearable={false}
                    options={axisSelectOptions}
                  />
                </Col>
              </FormGroup>
              <FormGroup controlId="formInlineRefDesc">
                <Col componentClass={ControlLabel} sm={4}>
                  References Description
                </Col>
                <Col sm={8}>
                  <FormControl
                    componentClass="textarea"
                    type="description"
                    placeholder="Description"
                    value={referenceDesc}
                    style={{ height: '193px' }}
                    onChange={e => this.onDescChange(e)}
                  />
                </Col>
              </FormGroup>
              <FormGroup style={{ marginBottom: 0 }}>
                <Col sm={12}>
                  <Button bsStyle="info" onClick={this.saveTemplate}>
                    Save Template
                  </Button>
                  {' '}
                  <Button bsStyle="danger" onClick={this.deleteTemplate}>
                    Delete Template
                  </Button>
                </Col>
              </FormGroup>
            </Form>
          </Col>
          <Col xs={9} md={6}>
            <GraphReferenceTable
              xLabel={xAxis.label}
              yLabel={yAxis.label}
              data={referencePoints}
              updateData={this.updateReferences}
            />
          </Col>
        </Row>
      </Grid>
    );
  }
}

ComputedPropsGraphContainer.propTypes = {
  graphData: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  show: React.PropTypes.bool.isRequired,
  style: React.PropTypes.object,
};

ComputedPropsGraphContainer.defaultProps = {
  style: {}
}

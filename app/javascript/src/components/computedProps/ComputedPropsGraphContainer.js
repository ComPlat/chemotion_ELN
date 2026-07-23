import React, {
  forwardRef, useContext, useImperativeHandle, useState
} from 'react';
import PropTypes from 'prop-types';

import { Select, CreatableSelect } from 'src/components/common/Select';
import {
  Row, Col, Form, Container
} from 'react-bootstrap';

import { StoreContext } from 'src/stores/mobx/RootStore';

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
  referenceDesc: 'Compounds are interesting as material for the '
    + 'Electron Transport Layer (ETL)',
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

const ComputedPropsGraphContainer = forwardRef(({ show, graphData }, ref) => {
  const { userStore } = useContext(StoreContext);
  const computedProps = userStore.profile?.data?.computed_props;

  const [graphTemplates, setGraphTemplates] = useState(
    () => computedProps?.graph_templates ?? [defaultTemplate]
  );
  const [curTemplateIdx, setCurTemplateIdx] = useState(
    () => computedProps?.cur_template_idx ?? 0
  );
  const [templateInputValue, setTemplateInputValue] = useState(
    () => graphTemplates[curTemplateIdx]?.name || ''
  );

  // Sync templateInputValue when the selected template changes, without
  // resetting it while the user is typing a new template name.
  const currentTemplateName = graphTemplates[curTemplateIdx]?.name || '';
  const [prevTemplateName, setPrevTemplateName] = useState(currentTemplateName);
  if (currentTemplateName !== prevTemplateName) {
    setPrevTemplateName(currentTemplateName);
    setTemplateInputValue(currentTemplateName);
  }

  const onXAxisChange = (xAxis) => {
    setGraphTemplates(graphTemplates.map((templ, idx) => (
      idx === curTemplateIdx ? { ...templ, xAxisType: xAxis.value } : templ
    )));
  };

  const onYAxisChange = (yAxis) => {
    setGraphTemplates(graphTemplates.map((templ, idx) => (
      idx === curTemplateIdx ? { ...templ, yAxisType: yAxis.value } : templ
    )));
  };

  const onDescChange = (e) => {
    const desc = e.target.value;
    setGraphTemplates(graphTemplates.map((templ, idx) => (
      idx === curTemplateIdx ? { ...templ, referenceDesc: desc } : templ
    )));
  };

  const onTemplateChange = (template) => {
    if (!template) {
      setTemplateInputValue('');
      return;
    }

    const tIdx = graphTemplates.findIndex((t) => t.name === template.label);
    if (tIdx > -1) {
      setCurTemplateIdx(tIdx);
      setTemplateInputValue(template.label);
    } else {
      const newTempl = {
        name: template.label,
        xAxisType: 'lumo',
        yAxisType: 'mean_abs_potential',
        referenceDesc: '',
        referencePoints: [],
      };
      const newGraphTemplates = [...graphTemplates, newTempl];

      setGraphTemplates(newGraphTemplates);
      setCurTemplateIdx(newGraphTemplates.length - 1);
      setTemplateInputValue(template.label);
    }
  };

  const updateReferences = (refs) => {
    setGraphTemplates(graphTemplates.map((templ, idx) => (
      idx === curTemplateIdx ? { ...templ, referencePoints: refs } : templ
    )));
  };

  const saveTemplate = () => {
    userStore.updateUserProfileValues({
      ...userStore.profile,
      data: {
        computed_props: {
          graph_templates: graphTemplates,
          cur_template_idx: curTemplateIdx,
        },
      },
    });
  };

  const deleteTemplate = () => {
    const newGraphTemplates = graphTemplates.filter((_templ, idx) => idx !== curTemplateIdx);
    const newTemplateIdx = curTemplateIdx > 1 ? curTemplateIdx - 1 : 0;

    setGraphTemplates(newGraphTemplates);
    setCurTemplateIdx(newTemplateIdx);

    userStore.updateUserProfileValues({
      ...userStore.profile,
      data: {
        computed_props: {
          graph_templates: newGraphTemplates,
          cur_template_idx: newTemplateIdx,
        },
      },
    });
  };

  useImperativeHandle(ref, () => ({
    saveTemplate,
    deleteTemplate,
  }));

  if (!show || graphData.length === 0) return <span />;

  const template = graphTemplates.length === 0
    ? defaultTemplate
    : graphTemplates[curTemplateIdx];

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
    x: dat.props[xAxisType] ?? dat.props.lumo,
    y: dat.props[yAxisType] ?? dat.props.mean_abs_potential,
  }));

  const axisSelectOptions = Object.keys(graphSettings).map((k) => (
    { label: graphSettings[k].label, value: k }
  ));
  const templateOptions = graphTemplates.map((templ, idx) => (
    { label: templ.name, value: idx }
  ));

  return (
    <Container>
      <Row>
        <Col xs={18} md={12}>
          <ComputedPropsGraph
            xAxis={xAxis}
            yAxis={yAxis}
            show={show}
            data={data}
            referencePoints={referencePoints}
            referenceDesc={referenceDesc}
          />
        </Col>
      </Row>
      <Row>
        <Col xs={9} md={6}>
          <GraphReferenceTable
            xLabel={xAxis.label}
            yLabel={yAxis.label}
            data={referencePoints}
            updateData={updateReferences}
          />
        </Col>
        <Col xs={9} md={6} className="d-flex">
          <Form horizontal className="flex-grow-1 justify-content-end mt-2">
            <Form.Group controlId="formInlineTemplate" className="mb-2">
              <Form.Label column sm={4}>Template</Form.Label>
              <CreatableSelect
                isClearable
                isInputEditable
                inputValue={templateInputValue}
                onChange={(selectedOption) => {
                  const value = selectedOption ? selectedOption.label : '';
                  setTemplateInputValue(value);
                  onTemplateChange(selectedOption);
                }}
                onInputChange={(inputValue, { action }) => {
                  if (action === 'input-change') {
                    setTemplateInputValue(inputValue);
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
                onChange={onXAxisChange}
                value={axisSelectOptions.find(({ value }) => value === xAxisType)}
                options={axisSelectOptions}
              />
            </Form.Group>
            <Form.Group controlId="formInlineYAxis" className="mb-2">
              <Form.Label column sm={4}>Y Axis</Form.Label>
              <Select
                onChange={onYAxisChange}
                value={axisSelectOptions.find(({ value }) => value === yAxisType)}
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
                onChange={onDescChange}
              />
            </Form.Group>
          </Form>
        </Col>
      </Row>
    </Container>
  );
});

ComputedPropsGraphContainer.displayName = 'ComputedPropsGraphContainer';

ComputedPropsGraphContainer.propTypes = {
  graphData: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  show: PropTypes.bool.isRequired,
};

export default ComputedPropsGraphContainer;

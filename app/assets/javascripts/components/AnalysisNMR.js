import React from 'react'
import{
  Col, Form, FormGroup, ControlLabel, FormControl, ButtonToolbar,
  Button, Radio, Checkbox, PanelGroup, Panel
} from 'react-bootstrap'
import Select from 'react-select'
import ElementActions from './actions/ElementActions'

import {solvents, experiments} from './staticDropdownOptions/device_options'

const AnalysisNMR = ({analysis, closeDetails}) => {
  const styleByExperimentState = (experiment) => {
    return experiment.isNew || experiment.isEdited
      ? "info" 
      : "default"
  }
  return (
    <div
      style={{marginBottom: 10}}
    >
      <AddExperimentButton
        analysis={analysis}
      />
      <PanelGroup defaultActiveKey={0} activeKey={analysis.activeAccordionExperiment} accordion>
        {analysis.experiments.length > 0
          ? analysis.experiments.map((experiment, key) => {
              return (
                <Panel
                  header={
                    <ExperimentHeader
                      experiment={experiment}
                      analysis={analysis}
                      id={key + 1}
                    />
                  }
                  eventKey={key}
                  key={key}
                  onClick={() => ElementActions.changeActiveAccordionExperiment(analysis, key)}
                  bsStyle={styleByExperimentState(experiment)}
                >
                  <Experiment
                    key={key}
                    experiment={experiment}
                    analysis={analysis}
                  />
                </Panel>
              )
            })
          : <div>This analysis has no experiments yet.</div>
        }
      </PanelGroup>
      <ButtonToolbar>
        <Button bsStyle="primary" onClick={() => closeDetails(analysis)}>
          Close
        </Button>
        <Button
          bsStyle="warning"
          disabled={!analysis.isEdited}
          onClick={() => ElementActions.saveDeviceAnalysis(analysis)}
        >
          Save
        </Button>
        <Button
          bsStyle="success"
          disabled={analysis.experiments.length === 0}
          onClick={() => ElementActions.generateDeviceAnalysisConfig(analysis)}
        >
          Generate Config
        </Button>
      </ButtonToolbar>
    </div>
  )
}

export default AnalysisNMR

const Experiment = ({analysis, experiment}) => {
  const handlePropChange = (prop, value) => {
    ElementActions.changeAnalysisExperimentProp(analysis, experiment, prop, value)
  }
  const handleSelectChange = (prop, e) => {
    if(e && e.value) {
      handlePropChange(prop, e.value)
    } else {
      handlePropChange(prop, "")
    }
  }

  return (
    <Form horizontal>
      <FormGroup>
        <Col sm={4}>
          <ControlLabel>Holder</ControlLabel>
        </Col>
        <Col sm={4}>
          <ControlLabel>Status</ControlLabel>
        </Col>
        <Col sm={4}>
          <ControlLabel>Name</ControlLabel>
        </Col>
        <Col sm={4}>
          <FormControl.Static>
            {experiment.holderId ? experiment.holderId : "-"}
          </FormControl.Static>
        </Col>
        <Col sm={4}>
          <FormControl.Static>
            {experiment.status ? experiment.status : "-"}
          </FormControl.Static>
        </Col>
        <Col sm={4}>
          <FormControl.Static>
            {analysis.sampleId}
          </FormControl.Static>
        </Col>
      </FormGroup>
      <FormGroup>
        <Col sm={6}>
          <ControlLabel>Solvent</ControlLabel>
        </Col>
        <Col sm={6}>
          <ControlLabel>Experiment</ControlLabel>
        </Col>
        <Col sm={6}>
          <Select
            id="solvent"
            name='solvent'
            multi={false}
            options={solvents}
            onChange={(e) => handleSelectChange('solvent', e)}
            value={experiment.solvent}
          />
        </Col>
        <Col sm={6}>
          <Select
            id="experiment"
            name='experiment'
            multi={false}
            options={experiments}
            onChange={(e) => handleSelectChange('experiment', e)}
            value={experiment.experiment}
          />
        </Col>
      </FormGroup>
      <FormGroup>
        <Col sm={4}>
          <ControlLabel>Priority</ControlLabel>
        </Col>
        <Col sm={4}>
          <ControlLabel>Daytime</ControlLabel>
        </Col>
        <Col sm={4}>
          <ControlLabel>Number of Scans</ControlLabel>
        </Col>
        <Col sm={4}>
          <Checkbox
            checked={experiment.checkbox}
            onChange={(e) => handlePropChange('checkbox', !experiment.checkbox)}
          >
          </Checkbox>
        </Col>
        <Col sm={4}>
          <Radio
            checked={experiment.onDay}
            onChange={(e) => handlePropChange('onDay', true)}
            inline
          >
            Day
          </Radio>
          <Radio
            checked={!experiment.onDay}
            onChange={(e) => handlePropChange('onDay', false)}
            inline
          >
            Night
          </Radio>
        </Col>
        <Col sm={4}>
          <FormControl
            value={experiment.numberOfScans}
            onChange={(e) => handlePropChange('numberOfScans', e.target.value)}
          />
        </Col>
      </FormGroup>
      <FormGroup>
        <Col sm={6}>
          <ControlLabel>Sweep Width</ControlLabel>
        </Col>
        <Col sm={6}>
          <ControlLabel>Time</ControlLabel>
        </Col>
        <Col sm={6}>
          <FormControl
            value={experiment.numeric}
            onChange={(e) => handlePropChange('numeric', e.target.value)}
          />
        </Col>
        <Col sm={6}>
          <FormControl
            value={experiment.time}
            onChange={(e) => handlePropChange('time', e.target.value)}
          />
        </Col>
      </FormGroup>
    </Form>
  )
}

const ExperimentHeader = ({analysis, experiment, id}) => {
  const handleRemoveDevice = (e) => {
    if(confirm('Delete the Experiment?')) {
      ElementActions.deleteAnalysisExperiment(analysis, experiment)
    }
    e.preventDefault()
  }

  return (
    <div style={{
      width: '100%',
      cursor: "pointer"
    }}>
      {id}
      <Button 
        bsSize="xsmall"
        bsStyle="danger"
        className="button-right"
        onClick={(e) => handleRemoveDevice(e)}
      >
        <i className="fa fa-trash"></i>
      </Button>
    </div>
  )
}

const AddExperimentButton = ({analysis}) => {
  return (
    <p>
      &nbsp;
      <Button
        className="button-right"
        bsSize="xsmall"
        bsStyle="success"
        onClick={() => ElementActions.createAnalysisExperiment(analysis)}
      >
        Add experiment
      </Button>
    </p>
  )
}

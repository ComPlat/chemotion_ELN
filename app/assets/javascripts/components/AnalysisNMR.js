import React from 'react'
import {Table, FormControl, Button, Radio, Checkbox} from 'react-bootstrap'
import Select from 'react-select'

import {solvents, experiments} from './staticDropdownOptions/device_options'

const AnalysisNMR = ({analysis}) => {
  return (
    <div
      style={{marginBottom: 10}}
    >
      <Button
        bsSize="xsmall"
        bsStyle='success'
        style={{float: "right"}}
      >
        Add Experiment
      </Button>
      <Table>
        <thead>
          <tr>
            <th></th>
            <th>Holder</th>
            <th>Status</th>
            <th>Name</th>
            <th>Solvent</th>
            <th>Experiment</th>
            <th>Checkbox</th>
            <th>Day/Night</th>
            <th>Number of Scans</th>
            <th>Numeric</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Button 
                bsStyle="danger"
                onClick={(e) => handleRemoveDevice(e)}
              >
                <i className="fa fa-trash"></i>
              </Button>
            </td>
            <td>
              <FormControl.Static>
                {analysis.holderId ? analysis.holderId : "-"}
              </FormControl.Static>
            </td>
            <td>
              <FormControl.Static>
                {analysis.status ? analysis.status : "-"}
              </FormControl.Static>
            </td>
            <td>
              <FormControl.Static>
                {analysis.sampleId}
              </FormControl.Static>
            </td>
            <td>
              <Select
                name='solvent'
                multi={false}
                options={solvents}
                onChange={(e) => this.handleFieldChanged(sample, 'solvent', e)}
                value={analysis.solvent}
              />
            </td>
            <td>
              <Select 
                name='experiment'
                multi={false}
                options={experiments}
                onChange={(e) => this.handleFieldChanged(sample, 'solvent', e)}
                value={analysis.experiment}
              />
            </td>
            <td>
              <Checkbox>
              </Checkbox>
            </td>
            <td>
              <Radio
                style={{marginTop: 0, marginBottom: 0}}
              >
                Day
              </Radio>
              <Radio
                style={{marginTop: 0, marginBottom: 0}}
              >
                Night
              </Radio>
            </td>
            <td>
              <FormControl>
                {analysis.numberOfScans}
              </FormControl>
            </td>
            <td>
              <FormControl>
                {analysis.numeric}
              </FormControl>
            </td>
            <td>
              <FormControl>
                {analysis.time}
              </FormControl>
            </td>
          </tr>
        </tbody>
      </Table>
    </div>
  )
}

export default AnalysisNMR

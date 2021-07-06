import React from 'react';
// import PropTypes from 'prop-types';
import { Table } from 'react-bootstrap';

import EditableCell from './EditableCell'

export default class EditableTable extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      data: this.props.temperature.data,
      newTime: "",
      newTemperature: ""
    }

    this.onCellValueChange = this.onCellValueChange.bind(this)
    this.removeRow = this.removeRow.bind(this)
    this.addRow = this.addRow.bind(this)

    this.handleTimeOnchange = this.handleTimeOnchange.bind(this)
    this.handleTemperatureOnchange = this.handleTemperatureOnchange.bind(this)

    this.handleNewTimeInput = this.handleNewTimeInput.bind(this)
    this.handleNewTemperatureInput = this.handleNewTemperatureInput.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    let data = nextProps.temperature.data
    data.sort((a, b) => (
      Date.parse("01/01/2016 " + a.time) - Date.parse("01/01/2016 " + b.time)
    ))

    this.setState({data: data})
  }

  handleTimeOnchange(oldVal, newVal) {
    newVal = this.checkDefaultTime(newVal)
    oldVal = this.checkDefaultTime(oldVal)

    if (newVal.length > 8) {
      newVal = newVal.substr(1)
      newVal = newVal.replace(/:/g, "")
      newVal = newVal.replace(/(\d)(?=(\d\d)+(?!\d))/g, "$1:")

      return newVal
    }

    let timeRegex = /^(?:(?:(\d\d):)?([0-5]?\d):)?([0-5]?\d)$/g
    let match = timeRegex.exec(newVal)

    if (match != null) {
      return (match[1] || "00") + ":" +
             (match[2] || "00") + ":" +
             (match[3] || "00")
    } else {
      return oldVal
    }
  }

  handleTemperatureOnchange(oldVal, newVal) {
    newVal = newVal.replace(/[^\d|-]/g, "")
    return this.checkDefaultTemperature(newVal)
  }

  handleNewTimeInput(e) {
    let newTime = e.target.value
    newTime = this.handleTimeOnchange(this.state.newTime, newTime)
    newTime = this.checkDefaultTime(newTime)

    this.setState({newTime: newTime})
  }

  handleNewTemperatureInput(e) {
    let newTemperature = e.target.value
    newTemperature = newTemperature.replace(/[^\d|-]/g, "")
    newTemperature = this.checkDefaultTemperature(newTemperature)

    this.setState({newTemperature: newTemperature})
  }

  checkDefaultTime(time) {
    if (typeof(time) == "undefined" || time == null ||
        time == "")
      return "00:00:00"
    else
      return time
  }

  checkDefaultTemperature(temperature) {
    if (typeof(temperature) == "undefined" || temperature == null ||
        temperature == "")
      return "21"
    else
      return temperature
  }

  removeRow(uid) {
    let {data} = this.state
    let {updateTemperature} = this.props
    if (uid > -1) {
      data.splice(uid, 1)
    }

    this.setState({data: data}, updateTemperature(data))
  }

  addRow() {
    let { data } = this.state
    let { updateTemperature } = this.props
    let newTime = this.newTime.value
    newTime = this.checkDefaultTime(newTime)
    let newTemperature = this.newTemperature.value
    newTemperature = this.checkDefaultTemperature(newTemperature)
    let newData = { time: newTime, value: newTemperature }

    data.push(newData)
    this.setState({
      data: data,
      newTime: '',
      newTemperature: ''
    }, updateTemperature(data))
  }

  onCellValueChange(uid, type, newValue) {
    let {data} = this.state
    let {updateTemperature} = this.props

    data[uid][type] = newValue

    this.setState({data: data}, updateTemperature(data))
  }

  render() {
    let {data, newTime, newTemperature} = this.state
    let {valueUnit} = this.props.temperature

    var rows = []
    for (let i = 0; i < data.length; i = i + 1) {
      let row = (
        <tr key={"rows_" + i}>
          <td className="table-cell" key={"time_td_" + i}>
              <EditableCell key={"time_cell_" + i} uid={i} type="time"
                value={data[i].time} ref={"time_cell_" + i}
                onCellValueChange={(uid, type, newValue) => this.onCellValueChange(uid, type, newValue)}
                inputOnChange={(oldVal, newVal) => this.handleTimeOnchange(oldVal, newVal)}/>
          </td>
          <td className="table-cell" key={"value_td_" + i}>
            <div>
              <div style={{width: "65%", float: "left"}}>
                <EditableCell key={"value_cell_" + i} uid={i} type="value"
                  value={data[i].value} ref={"value_cell_" + i}
                  onCellValueChange={(uid, type, newValue) => this.onCellValueChange(uid, type, newValue)}
                  inputOnChange={(oldVal, newVal) => this.handleTemperatureOnchange(oldVal, newVal)}/>
              </div>
              <i className="fa fa-minus clickable-icon" aria-hidden="true"
                 onClick={() => this.removeRow(i)} />
            </div>
          </td>
        </tr>
      )
      rows.push(row)
    }

    return (
      <Table responsive className="editable-table">
        <thead>
          <tr>
            <th> Time (hh:mm:ss) </th>
            <th> Temperature ({valueUnit}) </th>
          </tr>
        </thead>
        <tbody>
          {rows}
          <tr>
            <td className="table-cell">
              <input
                ref={(n) => { this.newTime = n; }}
                value={newTime}
                onChange={this.handleNewTimeInput}
              />
            </td>
            <td className="table-cell">
              <div>
                <input
                  ref={(m) => { this.newTemperature = m; }}
                  style={{ width: '65%' }}
                  value={newTemperature}
                  onChange={this.handleNewTemperatureInput}
                />
                <i
                  className="fa fa-plus clickable-icon"
                  aria-hidden="true"
                  onClick={this.addRow}
                />
              </div>
            </td>
          </tr>
        </tbody>
      </Table>
    );
  }
}

// EditableTable.propTypes = {
//   onChangeHandler: PropTypes.func.isRequired,
//   onCellValueChange: PropTypes.func.isRequired,
//   onKeyDown: PropTypes.func.isRequired
// }

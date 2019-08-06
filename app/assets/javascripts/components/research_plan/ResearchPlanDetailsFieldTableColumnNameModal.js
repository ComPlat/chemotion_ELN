import React, { Component} from "react"
import PropTypes from 'prop-types'
import { Modal, ButtonToolbar, Button, FormGroup, ControlLabel, FormControl, HelpBlock } from 'react-bootstrap'

class ResearchPlanDetailsFieldTableColumnNameModal extends Component {

  constructor(props) {
    super(props);

    const { columnName } = this.props

    this.state = {
      columnNameValue: columnName ? columnName : '',
      columnNameError: ''
    }
    this.handleColumnNameChange = this.handleColumnNameChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleColumnNameChange(event) {
    this.setState({ columnNameValue: event.target.value });
  }

  handleSubmit(submit) {
    const { columns, onSubmit } = this.props
    const { columnNameValue } = this.state

    if (submit) {
      const keys = columns.map(column => { return column.key })
      if (!columnNameValue) {
        this.setState({ columnNameError: 'Please give a column name.' })
      } else if (keys.indexOf(columnNameValue) > -1) {
        this.setState({ columnNameError: 'A column with this title already exists.' })
      } else {
        this.setState({ columnNameError: '', columnNameValue: '' })
        onSubmit(columnNameValue)
      }
    } else {
      this.setState({ columnNameError: '', columnNameValue: '' })
      onSubmit()
    }
  }

  render() {
    const { showModal } = this.props
    const { columnNameValue, columnNameError } = this.state

    let show, title
    if (showModal == 'insert') {
      show = true
      title = 'Insert column'
    } else if (showModal == 'rename') {
      show = true
      title = 'Rename column'
    }

    let validationState = columnNameError ? 'error' : null

    return (
      <Modal animation show={show}>
        <Modal.Header closeButton>
          <Modal.Title>
            {title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body >
          <div>
            <FormGroup validationState={validationState}>
              <ControlLabel>Colum name</ControlLabel>
              <FormControl
                type="text"
                value={columnNameValue}
                onChange={this.handleColumnNameChange}
              />
              <HelpBlock>{columnNameError}</HelpBlock>
            </FormGroup>
          </div>
          <div>
            <ButtonToolbar>
              <Button bsStyle="warning" onClick={event => this.handleSubmit(false)}>
                Cancel
              </Button>
              <Button bsStyle="primary" onClick={event => this.handleSubmit(true)}>
                {title}
              </Button>
            </ButtonToolbar>
          </div>
        </Modal.Body>
      </Modal>
    )
  }
}

ResearchPlanDetailsFieldTableColumnNameModal.propTypes = {
  showModal: PropTypes.string,
  columnName: PropTypes.string,
  onSubmit: PropTypes.func,
  columns: PropTypes.array
}

export default ResearchPlanDetailsFieldTableColumnNameModal

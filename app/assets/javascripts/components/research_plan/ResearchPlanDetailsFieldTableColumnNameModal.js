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
  }

  handleColumnNameChange(event) {
    this.setState({ columnNameValue: event.target.value });
  }

  handleSubmit() {
    const { columns, onSubmit } = this.props
    const { columnNameValue } = this.state
    const keys = columns.map(column => { return column.key })

    if (!columnNameValue) {
      this.setState({ columnNameError: 'Please give a column name.' })
    } else if (keys.indexOf(columnNameValue) > -1) {
      this.setState({ columnNameError: 'A column with this title already exists.' })
    } else {
      this.setState({ columnNameError: '', columnNameValue: '' })
      onSubmit(columnNameValue)
    }
  }

  render() {
    const { modal, onHide } = this.props
    const { columnNameValue, columnNameError } = this.state

    let title
    if (modal.action == 'insert') {
      title = 'Insert column'
    } else if (modal.action == 'rename') {
      title = 'Rename column'
    }

    let validationState = columnNameError ? 'error' : null

    return (
      <Modal animation show={modal.show} onHide={onHide}>
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
                onChange={this.handleColumnNameChange.bind(this)}
              />
              <HelpBlock>{columnNameError}</HelpBlock>
            </FormGroup>
          </div>
          <div>
            <ButtonToolbar>
              <Button bsStyle="warning" onClick={onHide}>
                Cancel
              </Button>
              <Button bsStyle="primary" onClick={this.handleSubmit.bind(this)}>
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
  modal: PropTypes.object,
  columnName: PropTypes.string,
  onSubmit: PropTypes.func,
  onHide: PropTypes.func,
  columns: PropTypes.array
}

export default ResearchPlanDetailsFieldTableColumnNameModal

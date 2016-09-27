import React, {Component} from 'react';
import {OverlayTrigger, Dropdown, Button, MenuItem, Tooltip, Glyphicon}
  from 'react-bootstrap';
import CollectionActions from '../actions/CollectionActions';

export default class ExportImportButton extends Component {
  render() {
    const {isDisabled} = this.props

    const tooltip = (<Tooltip id="export_button">Import Export</Tooltip>)
    let title =
      <div>
        <Glyphicon bsSize="small" glyph="import"/> <Glyphicon bsSize="small" glyph="export"/>
      </div>

    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <Dropdown id='export-dropdown' title={title} disabled={isDisabled}>
          <Dropdown.Toggle>
            <Glyphicon glyph="import"/> <Glyphicon glyph="export"/>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <MenuItem onSelect={() => CollectionActions.downloadReportCollectionSamples()}>
              Export samples from collection
            </MenuItem>
            <MenuItem onSelect={() => CollectionActions.downloadReportCollectionReactions()}>
              Export samples from collection reactions
            </MenuItem>
            <MenuItem onSelect={() => CollectionActions.downloadReportCollectionWellplates()}>
              Export samples from collection wellplates
            </MenuItem>
            <MenuItem divider />
            <MenuItem onSelect={this.props.importFunction}>
              Import samples to collection
            </MenuItem>
          </Dropdown.Menu>
        </Dropdown>
      </OverlayTrigger>
    )
  }
}

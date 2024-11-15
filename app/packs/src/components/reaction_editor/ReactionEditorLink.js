import React from 'react'
import { Tooltip, OverlayTrigger, Nav } from 'react-bootstrap';

const ReactionEditorLink = ({reaction}) => {
  return (
    <>
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="editReaction">Edit Reaction</Tooltip>}
      >
        <Nav.Link href={reaction.editor_link_target} target="_blank" className="btn btn-xs btn-success button-right">
          <i className="fa fa-edit" />
        </Nav.Link>
      </OverlayTrigger>
    </>
  )
}

export default ReactionEditorLink

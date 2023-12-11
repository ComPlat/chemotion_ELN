import React from 'react'
import { Link } from 'react-bootstrap/lib/Navbar';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

const ReactionEditorLink = ({reaction}) => {
  return (
    <>
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="editReaction">Edit Reaction</Tooltip>}
      >
        <Link href={reaction.editor_link_target} target="_blank" className="btn btn-xs btn-success button-right">
          <i className="fa fa-edit" />
        </Link>
      </OverlayTrigger>
    </>
  )
}

export default ReactionEditorLink

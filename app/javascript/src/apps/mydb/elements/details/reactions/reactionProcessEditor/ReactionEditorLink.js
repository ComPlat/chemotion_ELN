import React from 'react'
import { Button, Tooltip, OverlayTrigger, Nav } from 'react-bootstrap';

const ReactionEditorLink = ({ reaction, size = "sm" }) => {
	return (
		<OverlayTrigger
			placement="bottom"
			overlay={<Tooltip id="editReaction">Edit Reaction Process</Tooltip>}
		>
			<Button
				size={size}
				variant="secondary"
				href={reaction.editor_link_target}
				target={"_blank"}
			>
				<i className="fa fa-edit" />
			</Button>
		</OverlayTrigger>
	)
}

export default ReactionEditorLink

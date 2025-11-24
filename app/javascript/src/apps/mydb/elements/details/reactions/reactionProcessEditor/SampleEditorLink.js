import React from 'react'
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

const SampleEditorLink = ({ sample }) => {
	return (
		<>
			<OverlayTrigger
				placement="bottom"
				overlay={<Tooltip id="editSampleProcess">Edit Sample Process</Tooltip>}
			>
				<a href={sample.editor_link_target} target="_blank" className="btn btn-xxsm btn-light button-right">
					<i className="fa fa-edit" />
				</a>
			</OverlayTrigger>
		</>
	)
}

export default SampleEditorLink

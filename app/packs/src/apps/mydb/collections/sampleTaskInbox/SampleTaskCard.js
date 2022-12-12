import React from 'react';
import { Panel } from 'react-bootstrap';

const SampleTaskCard = ({ sampleTask }) => {
  let svg = "";
  if (sampleTask.sample_svg_file) {
    svg = <img src={"/images/samples/" + sampleTask.sample_svg_file} />
  } else {
    svg = 'no image available';
  }

  return (
    <Panel bsStyle="info">
      <Panel.Heading>
        {sampleTask.short_label} {sampleTask.display_name}
      </Panel.Heading>
      <Panel.Body>
        {svg}
      </Panel.Body>
    </Panel>
  )
}
export default SampleTaskCard;

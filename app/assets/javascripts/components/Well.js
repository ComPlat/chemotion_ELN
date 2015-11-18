import React, {PropTypes, Component} from 'react';
import SVG from 'react-inlinesvg';

export default class Well extends Component {
  render() {
    const {sample, active} = this.props;
    
    const className = (active) ? "well-molecule molecule-selected" : "well-molecule";
    if (sample) {
      const svgPath = `/images/molecules/${sample.molecule.molecule_svg_file}`;
      return (
        <div>
          <SVG className={className} src={svgPath}/>
        </div>
      );
    } else {
      return <div></div>
    }
  }
}

Well.propTypes = {
  sample: PropTypes.object
};

import React, {PropTypes, Component} from 'react';
import SVG from 'react-inlinesvg';

export default class Well extends Component {
  render() {
    const {sample} = this.props;
    if (sample) {
      const svgPath = `/images/molecules/${sample.molecule.molecule_svg_file}`;
      return (
        <div>
          {sample.name}
          <SVG className="well-molecule" src={svgPath}/>
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

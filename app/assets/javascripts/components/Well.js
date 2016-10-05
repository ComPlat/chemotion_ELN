import React, {PropTypes, Component} from 'react';
import SVG from 'react-inlinesvg';

export default class Well extends Component {
  render() {
    const {sample, active} = this.props;

    const className = (active) ? "well-molecule molecule-selected" : "well-molecule";
    if (sample) {
      return (
        <div>
          <SVG className={className} key={sample.id} src={sample.svgPath}/>
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

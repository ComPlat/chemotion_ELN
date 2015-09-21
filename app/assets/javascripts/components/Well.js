import React, {Component} from 'react';
import SVG from 'react-inlinesvg';

export default class Well extends Component {
  render() {
    const {hasLabel, well} = this.props;
    let label = '';
    if(hasLabel){
      const svgPath = `/images/molecules/${well.sample.molecule.molecule_svg_file}`;
      label = <div>
        <div className="well-text">
          {well.sample.name}
        </div>
        <SVG className="well-molecule" src={svgPath}/>
      </div>;
    }
    return (
      <div>
        {label}
      </div>
    );
  }
}

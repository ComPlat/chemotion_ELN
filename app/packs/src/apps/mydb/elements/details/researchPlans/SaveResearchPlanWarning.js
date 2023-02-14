import React, { Component } from 'react';
import PropTypes from "prop-types";
import {Alert} from 'react-bootstrap';

export default class SaveResearchPlanWarning extends Component {

    constructor(props) {
        super(props);
    }


    render(){
        if(!this.props.visible) {return null;}        
        
        return (
          <div className={this.props.warningStyle}>
            <Alert>{this.props.warningMessage}</Alert>
          </div>
        );
    }
}

SaveResearchPlanWarning.propTypes = {
    visible: PropTypes.bool.isRequired,
    warningStyle: PropTypes.string,
    warningMessage: PropTypes.string
};

SaveResearchPlanWarning.defaultProps={
    warningStyle : 'imageEditedWarning',
    warningMessage: 'Image was edited. Please save Researchplan to apply changes.'

}
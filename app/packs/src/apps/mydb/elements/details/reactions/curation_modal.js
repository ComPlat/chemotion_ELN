import React, { Component , useState} from 'react';
import { Button, ButtonToolbar, FormControl, Glyphicon, Modal, Table, Popover,Tooltip,OverlayTrigger} from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ReactionDetails from './ReactionDetails';



export default class Curation_modal extends Component {

    constructor(props) {
      super(props);
      const { reaction } = props;
      this.handleShow = this.handleShow.bind(this);
      this.handleClose = this.handleClose.bind(this);
      this.handleDesc = this.handleDesc.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.state = {
        desc : this.clean_data(this.props.description),
        show: false, 
        reaction: reaction,
      }
    }

    handleSubmit(closeView = false) {
      LoadingActions.start();
      const { reaction } = this.props;
      console.log(reaction);
      if (reaction && reaction.isNew) {
        ElementActions.createReaction(reaction);
      } else {
        ElementActions.updateReaction(reaction, closeView);
      }
      if (reaction.is_new || closeView) {
        DetailActions.close(reaction, true);
      }
    }

    handleDesc(){
      const old_desc = this.clean_data(this.props.description);
      const new_desc = old_desc.replaceAll("  ", " ");
      this.setState({ desc: new_desc});
    }

    handleClose() {
      this.setState({ show: false });
    }
  
    handleShow() {
      this.setState({ show: true });
    }

    spell_check(){
      var Typo = require("typo-js"); 
      var dictionary = new Typo("en_US",false,false, { dictionaryPath: "typo/dictionaries" });
      var is_spelled_correctly = dictionary.check("mispeled");
      console.log( "Is 'mispelled' spelled correctly? " + is_spelled_correctly );
      var is_spelled_correctly = dictionary.check("misspelled");
      console.log( "Is 'misspelled' spelled correctly? " + is_spelled_correctly );
      var array_of_suggestions = dictionary.suggest("mispeling");
      console.log( "Spelling suggestions for 'mispeling': " + array_of_suggestions.join( ', ' ) );
    }
    
    getHighlightedText(text, higlight) {
      // Split text on higlight term, include term itself into parts, ignore case
      var parts = text.split(new RegExp(`(${higlight})`, "gi"));
      return parts.map((part, index) => (
        <React.Fragment key={index}>
          {part.toLowerCase() === higlight.toLowerCase() ? (
          <b style={{ backgroundColor: "#e8bb49" }}>{part}</b>) : (part)}
        </React.Fragment>
      ));}

    clean_data(description){
        const array_input = Object.values(description);
        let array_output =[];
        array_input.forEach((element) => {
            array_output = array_output.concat(element.insert);
        });
        const str_out = (array_output.join(""));
        return str_out;
    }

    render() {
      const Compo = ({ higlight, value }) => {
        return <p>{this.getHighlightedText(value, higlight)}</p>;
      };
      return (
        <div>
          <Button bsStyle="primary" bsSize="small" onClick={this.handleShow}>
            Check Spelling
          </Button>
  
          <Modal show={this.state.show} onHide={this.handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>Spell Check</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div style={{border: "ridge",
                    padding: "10px",
                    fontFamily: "Arial",
                    borderRadius: "10px",}}>
                 <Compo value={this.state.desc} higlight={"e"} /> 
                </div>  
                     
                <div>
                    suggestion
                </div>
                <div className="row">
                  <Button onClick={this.spell_check}>fix</Button>
                  <Button onClick={() => this.handleSubmit(true)}> 
                    save and close
                  </Button>
                  <Button>Change</Button>
                  <Button>Skip</Button>
                </div>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.handleClose}>Close</Button>
            </Modal.Footer>
          </Modal>
        </div>
      );
    }
  }

  
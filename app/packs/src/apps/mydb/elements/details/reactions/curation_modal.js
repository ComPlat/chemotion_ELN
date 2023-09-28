import React, { Component } from 'react';
import { Button, ButtonToolbar, FormControl, Glyphicon, Modal, Table, Popover,Tooltip,OverlayTrigger} from 'react-bootstrap';

export default class Curation_modal extends Component {
    constructor(props) {
      super(props);
      this.handleShow = this.handleShow.bind(this);
      this.handleClose = this.handleClose.bind(this);
      this.state = {
        show: false
      };
    }

    handleClose() {
      this.setState({ show: false });
    }
  
    handleShow() {
      this.setState({ show: true });
    }

    clean_data(description){
        const array_input = Object.values(description);
        let array_output =[];
        array_input.forEach((element) => {
            array_output = array_output.concat(element.insert);
        });
        const str_out = (array_output.join(""));
        return str_out
    }

    spell_check(input){
        const regexp = /  /g;
        const str = input;
        const matches = str.matchAll(regexp);
        let typo_index_array = [];
        for (const match of matches) {
          typo_index_array.push([match.index,match.index + match[0].length])
        // console.log(
        // `Found ${match[0]} start=${match.index} end=${
        //  match.index + match[0].length}.`,)
        }
         return (typo_index_array);
      }
    spell_check_underline(input){
      
    }

    render() {
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
                {this.clean_data(this.props.description)}
                
                </div>
                <div>
                {this.spell_check(this.clean_data(this.props.description))}
                    suggestion
                </div>
                <div class="row">
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

  
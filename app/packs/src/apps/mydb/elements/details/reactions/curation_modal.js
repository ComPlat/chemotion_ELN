import React, { Component } from 'react';
import { Button, ButtonToolbar, FormControl, Glyphicon, Modal, Table, Popover,Tooltip,OverlayTrigger} from 'react-bootstrap';

export default class Curation_modal extends Component {
   
    constructor(props) {
      super(props);
      this.handleShow = this.handleShow.bind(this);
      this.handleClose = this.handleClose.bind(this);
      this.state = {
        show: false,
        cleanData : this.clean_data(props.description),
        typo: "  " 
      };
    }
    handleClose() {
      this.setState({ show: false });
    }
  
    handleShow() {
      this.setState({ show: true });
    }


    highlight(desc_text, typo){ 
    

    // if (typo_array.length > 0 ){
    //   console.log(typo_array)
    // desc_text = {desc_text.split(typo)[0]} <b style={{ backgroundColor: '#e8bb49' }}> {typo} </b> {desc_text.split(typo)[1]}
    //   used_typo.push(typo_array[count_var])
    //   typo_array = this.spell_check(desc_text)
    //   typo_array.shift()
      // used_typo.forEach((used_typo_pair) => {
      //   // console.log(used_typo_pair)
      //   console.log("array " + typo_array[count_var] +" used " + used_typo_pair )
      //   if (typo_array[count_var] === used_typo_pair){
      //     typo_array = typo_array.splice(count_var,1)
      //     console.log("splice done " + count_var)
      //   } 
      //   else console.log("no splice "+ count_var)
      // })
    //   count_var = count_var +1
      
    //   };
      // console.log(typo_array)
    return ;
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
        // console.log(typo_index_array)
         return (typo_index_array);
    }

    underline_typo(description){
      let typo_index_array = this.spell_check(description)
      let length = typo_index_array.length
      let count = 0
      let new_text =""
      new_text = this.highlight(description,"  ")
        
      
      console.log(new_text)
      return new_text

    }
    
    Highlighted_text(props){
    let clean_desc = clean_data(props.description)
    let typo = "  "
    let hl_desc = this.highlight(props.description, typo)
    return (
       <b style={{ backgroundColor: '#e8bb49' }}> {typo} </b> 
    )

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
                <this.Highlighted_text/>
                    suggestion
                </div>
                <div className="row">
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

  
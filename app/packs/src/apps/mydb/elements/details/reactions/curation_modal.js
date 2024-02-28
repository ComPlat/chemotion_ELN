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
        show : false, 
        reaction : reaction,
        mispelled_words : ["two | four"],
      }
      this.setState({mispelled_words:[]})
    }

    handleSubmit(closeView = false) {
      LoadingActions.start();
      const { reaction } = this.props;
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

    spell_check(description){
      // console.log(description)
      var Typo = require("typo-js"); 
      var dictionary = new Typo("en_US", false, false, { dictionaryPath: "typo/dictionaries" });
      // var unit_dictionary =  new Typo("sci_units",false, false, { dictionaryPath: "/typo/dictionaries"});
      var ms_words = [];
      var word_array = description.split(' ')
      for (let i = 0; i < word_array.length; i++){
        var punctuation = /[\.,?!\(\)]/g;
        word_array[i] = word_array[i].replace(punctuation, "");
        // check if word has a number in it
        if (word_array[i] == ""||  /\d/.test(word_array[i]))
          {console.log("number detected " + word_array[i])}
        // if no number, check if in the dictionary, and set varible s_c_w to false if not in dictionary
        else {var spell_checked_word = dictionary.check(word_array[i]);

          // (console.log("test_2 " + word_array[i]+ "  :  " + spell_checked_word))
        // if word is misspelled add word to ms_word array
        if (spell_checked_word == false){
          ms_words.push(word_array[i]);
        }
        }  
      }
      ms_words = this.uniq(ms_words)
      
      this.setState({mispelled_words: ms_words})
    }
    
    getHighlightedText(text, highlight) {
      // Split text on higlight term, include term itself into parts, ignore case
      // if (typeof text === 'string'){}
      // else{
      //   text = text.toString()
      // }
      // let test_1 = "this is a string"
      // let mispelled_words = ["is", "a"]
      // const splitByNumber = {
      //   [Symbol.split](str) {
      //     const mw = mispelled_words;
      //     const result = [];
      //     let pos = 0
      //     while (pos < mw.length){
      //       result.push(str.split(mispelled_words[pos]))
      //       pos++
      //     }
      //     return result;
          
      //   },
      // };
      // console.log(test_1.split(splitByNumber));
      
      console.log("highlight: " + highlight)
      // var highlight = "/one|three|five/"
        var parts = text.split(new RegExp(`(${highlight})`, "gi"));
        // var parts = text.split(highlight);
        console.log("parts: " + parts)
        let highlight_array = highlight.split("|")

        console.log(highlight_array)
      return parts.map((part, index) => (
        <React.Fragment key={index}>
        {/* Todo change this to detect if part is in highlight_array */}
          {/* {part.toLowerCase() === highlight.toLowerCase()  */}
        {highlight_array.includes(part.toLowerCase())
          ? (<b style={{ backgroundColor: "#e8bb49" }}>{part}</b>) 
          : (part)}
        </React.Fragment>
      ));}

    highlight_mispelled_words(text,ms_word_array){
      var test = []
      // let ms_word_str = ms_word_array.join("|")
      // for (let i = 0; i < ms_word_array.length; i++){
      //   // console.log(ms_word_array[i])
      //    test[i] = this.getHighlightedText(text,ms_word_array[i])
      //   // console.log(text)
      // }
      test = this.getHighlightedText(text,ms_word_array)
      // console.log(ms_word_str)
      console.log(test)
      return test
    }

    uniq(a) {
      var prims = {"boolean":{}, "number":{}, "string":{}}, objs = [];
      return a.filter(function(item) {
          var type = typeof item;
          if(type in prims)
              return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
          else
              return objs.indexOf(item) >= 0 ? false : objs.push(item);
      });
    }


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
      const Compo = ({ highlight, text }) => {
        return <p>{this.highlight_mispelled_words(text, highlight)}</p>;
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
                 <Compo text={this.state.desc} highlight= 'one|three' /> 
                </div>  
                     
                <div>
                    suggestion
                </div>
                <div className="row">
                  <Button onClick={() =>this.spell_check(this.state.desc)}>fix</Button>
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

  
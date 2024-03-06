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
      this.handleSuggest = this.handleSuggest.bind(this);
      this.handleSuggest = this.handleSuggest.bind(this);
      this.state = {
        desc : this.clean_data(this.props.description),
        show : false, 
        reaction : reaction,
        mispelled_words : [],
        suggestion : [],
        suggestion_index : 0
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

    advance_suggestion(input){
      input = input +1 
      this.setState( {suggestion_index : input} )
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

    handleSuggest(miss_spelled_words, index){
      var Typo = require("typo-js");
      var dictionary = new Typo( "en_US", false, false, { dictionaryPath: "/typojs" });
      var mispelled_word = miss_spelled_words[index]
      if (typeof mispelled_word === "string" )
      {
      var ms_suggestion = dictionary.suggest(mispelled_word)
      this.setState({ suggestion : ms_suggestion}) }   
      else {
        console.log("run spell check")
      }
    }


    spell_check(description){
      // var Typo = require("typo-js"); 
      // var dictionary = new Typo("en_US", false, false, { dictionaryPath: "typo/dictionaries" });
      // var unit_dictionary =  new Typo("sci_units",false, false, { dictionaryPath: "/typo/dictionaries"});
      var Typo = require("typo-js");
      var dictionary = new Typo( "en_US", false, false, { dictionaryPath: "/typojs" });
      console.log("tesst11111111111")
      console.log(dictionary.suggest("tesst"))
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
        // if word is misspelled add word to ms_word array
        if (spell_checked_word == false){
          ms_words.push(word_array[i]);
        }
        }  
      }
      ms_words = this.uniq(ms_words)
      console.log(ms_words)
      this.setState({mispelled_words: ms_words})
    }
    
    getHighlightedText(text, highlight) {
        var parts = text.split(new RegExp(`(${highlight})`, "gi"));
        let highlight_array = highlight.split("|")
      return parts.map((part, index) => (
        <React.Fragment key={index}>
        {highlight_array.includes(part.toLowerCase())
          ? (<b style={{ backgroundColor: "#e8bb49" }}>{part}</b>) 
          : (part)}
        </React.Fragment>
      ));}

    highlight_mispelled_words(text,ms_word_array){
      var ms_word_regex = ms_word_array.join("|")
      var test = this.getHighlightedText(text,ms_word_regex)
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
      const SuggestBox = ({suggest_array}) =>{
        return suggest_array.map((suggestion) =>  (
  <div>
    <input type="radio" id={suggestion} name={suggestion} value={suggestion} />
    <label >{suggestion}</label>
  </div>
        ));
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
                 <Compo text={this.state.desc} highlight= {this.state.mispelled_words} /> 
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
                  <Button onClick={()=> this.advance_suggestion(this.state.suggestion_index)}>Skip</Button>
                  <Button onClick={()=>this.handleSuggest(this.state.mispelled_words, this.state.suggestion_index)}>suggest</Button>
                </div>
                <fieldset>
                  <SuggestBox suggest_array={this.state.suggestion}></SuggestBox>
                </fieldset>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.handleClose}>Close</Button>
            </Modal.Footer>
          </Modal>
        </div>
      );
    }
  }

  
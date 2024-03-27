import React, { Component , useState} from 'react';
import { Button, ButtonToolbar, FormControl, Glyphicon, Modal, Table, Popover,Tooltip,OverlayTrigger} from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';


export default class CurationModal extends Component {

    constructor(props) {
      super(props);
      const { reaction } = props;
      this.handleShow = this.handleShow.bind(this);
      this.handleClose = this.handleClose.bind(this);
      this.handleDesc = this.handleDesc.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.handleSuggest = this.handleSuggest.bind(this);
      this.handleSuggest = this.handleSuggest.bind(this);
      this.change_corect_word = this.change_corect_word.bind(this)
      this.handleChange = this.handleChange.bind(this)
      this.handleSuggestChange = this.handleSuggestChange.bind(this)
      this.state = {
        desc : this.clean_data(this.props.description),
        show : false, 
        reaction : reaction,
        mispelled_words : [],
        suggestion : [],
        suggestion_index : 0,
        correct_word : ""
      }
      
    }

    handleSuggestChange(e){
      const new_word = e.target.value
      this.setState({correct_word:new_word})
    }

    handleSubmit(closeView = false,description) {
      LoadingActions.start();
      const { reaction } = this.props;
      if (reaction && reaction.isNew) {
        ElementActions.createReaction(reaction);
        console.log("create")
      } else {
        var new_reaction  = reaction
        new_reaction.description = description
        console.log(new_reaction)
        this.setState({reaction:new_reaction} )
        ElementActions.updateReaction(reaction, closeView);
        // console.log(reaction)
      }
      if (reaction.is_new || closeView) {
        DetailActions.close(reaction, true);
      }
    }

    advance_suggestion(input,miss_spelled_words){
      if (input < miss_spelled_words.length-1){
      input = input +1 }
      else {
        input = 0
      }
      this.handleSuggest(miss_spelled_words, input)
      this.setState( {suggestion_index : input} ) 
    }

    handleDesc(){
      const old_desc = this.clean_data(this.props.description);
      const new_desc = old_desc.replaceAll("  ", " ");
      this.setState({ desc: new_desc});
    }

    handleChange(){
      this.props.onDescChange(this.state.desc)
    }

    handleClose() {
      this.setState({ show: false });
    }
  
    handleShow() {
      this.setState({ show: true });
    }

    add_new_word_to_custom_dic(new_word){
      // const axios = require('axios');
      // axios({
      //   method: 'post',
      //   url: '/typojs/custom',
      //   data: {
      //     firstName: 'Fred',
      //     lastName: 'Flintstone'
      //   }
      // });

      // fetch("/typojs/custom/custom.dic")
      // .then(response => (response.text()))
      // // .then(responsetext => console.log(responsetext))
      // .then(responsetext => {var text = responsetext 
      //         console.log(new_word)
      //         var ammendedDictionairy = (text + new_word + "\n")
      //         fetch("/typojs/custom/custom.dic", {method: "POST", headers:{"Content-Type": "text/plain"}, body : ammendedDictionairy})} )
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

    use_all_dicitonary(en_dictionary,custom_dictionary, word){
      var Typo = require("typo-js");
      var is_word_correct = false ;
      if (en_dictionary.check(word)){
        is_word_correct = true}
      else { if(custom_dictionary.check(word)){
        is_word_correct = true
      }}

      console.log(word + ": " +is_word_correct)
      return is_word_correct
    }

    check_sub_script(input_text){
      var potential_mol_form = input_text.match(/\b[a-z]\w*\d[a-z]*/gi)
      console.log(potential_mol_form)
      for( let step = 0; step < potential_mol_form.length; step++){
        var split_form = potential_mol_form[step].split(/(\d)/g)
        split_form = split_form.filter(n) 
        console.log(split_form)
        for (let int = 0; int < split_form.length ; int++)
        {
    //       return split_form.map((part, index) => (
    //         <React.Fragment key={index}>
    //           {(split_form[int] != "" && split_form[int].match(/\d/))
    //           ? (<b style={{ backgroundColor: "#e8bb49" }}>{part}</b>) 
    //           : (part)}
    //         </React.Fragment>
    // ))
          if(split_form[int] != ""){
          if (split_form[int].match(/\d/)){
            console.log("number found: " + split_form[int])
          }
          else{
            console.log("number not found: "+ split_form[int])
          }}
        }
       
      }
    }


    spell_check(description){
      // var unit_dictionary =  new Typo("sci_units",false, false, { dictionaryPath: "/typo/dictionaries"});
      var Typo = require("typo-js");
      var dictionary_array = []
      var en_dictionary = new Typo( "en_US", false, false, { dictionaryPath: "/typojs" });
      var cus_dictionary = new Typo( "custom", false, false, { dictionaryPath: "/typojs" });
      dictionary_array.push(en_dictionary, cus_dictionary);
      var ms_words = [];
      var word_array = description.split(' ')
      for (let i = 0; i < word_array.length; i++){
        var punctuation = /[\.,?!\(\)]/g;
        word_array[i] = word_array[i].replace(punctuation, "");
        // check if word has a number in it
        if (word_array[i] == ""||  /\b\d\S*\b/.test(word_array[i]))
          {console.log("number detected "  + word_array[i])}

        // if no number, check if in the dictionary, and set varible s_c_w to false if not in dictionary
        else {var spell_checked_word = this.use_all_dicitonary(en_dictionary,cus_dictionary,word_array[i]);
        // if word is misspelled add word to ms_word array
        if (spell_checked_word == false){
          ms_words.push(word_array[i]);
        }
        }  
      }
      ms_words = this.uniq(ms_words)
      this.setState({mispelled_words: ms_words})
      this.handleSuggest(ms_words, 0)
    }

    change_misspelling(description,selected_choice,ms_words,index){
      if (selected_choice !== ""){
      var fixed_description = description.replace(ms_words[index], selected_choice);}
      else{
      var fixed_description = description}
      if (index < ms_words.length-1){
        index= index +1 }
      else {
          index = 0
        }
      this.setState({desc :fixed_description});
      this.setState({suggestion_index : index});
      this.handleSuggest(ms_words, index);
      this.setState({correct_word: ""})
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

    change_corect_word(changeEvent) {
      this.setState({correct_word: changeEvent.target.value}) 
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
        if (suggest_array.length != 0){
          return suggest_array.map((suggestion,id) =>  (
            <div key={id}>
              <label>
                <input type="radio" value={suggestion} onChange={this.change_corect_word} checked={this.state.correct_word === suggestion}/>
                  {suggestion}
                </label> 
            </div>  
        ));}
        else{
          return (
            <div>
              <h5>None</h5>
            </div>
          )
        }
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
              
              <div className="row"> 
             
                <Button onClick={()=>this.spell_check(this.state.desc) }>spell check</Button>
                <Button onClick={()=>this.change_misspelling(this.state.desc, this.state.correct_word, this.state.mispelled_words, this.state.suggestion_index)}>Change</Button>
                <Button onClick={()=>this.advance_suggestion(this.state.suggestion_index,this.state.mispelled_words)}>Skip</Button>
                <Button onClick={()=>this.handleChange()}> save </Button>
                <Button onClick={()=> this.check_sub_script(this.state.desc)}> check subscript</Button>
              </div>
              <h4>
                  Suggestions
              </h4>
              <form>
                <SuggestBox suggest_array={this.state.suggestion}></SuggestBox>
                <legend>Or enter a new word</legend>
                <input value={this.state.correct_word}
                  onChange={this.handleSuggestChange}
                />
              </form>
              <a class="btn btn-success" href={"http://localhost:3000/api/v1/dictionary.json?new_word=".concat(this.state.correct_word)} target="_blank">add to dictionairy</a>

            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.handleClose}>Close</Button>
            </Modal.Footer>
          </Modal>
        </div>
      );
    }
  }

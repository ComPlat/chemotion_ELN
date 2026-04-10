/* eslint-disable react/sort-comp */
import React from 'react';
import ReactDOM from 'react-dom';
import { Form, InputGroup, Overlay, ListGroup }
  from 'react-bootstrap';
import debounce from 'es6-promise-debounce';
import { isString } from 'lodash';

import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';

export default class AutoCompleteInput extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: '',
      target: null,
      valueBeforeFocus: null,
      showSuggestions: false,
      suggestions: null,
      suggestionFocus: null,
      error: '',
      inputWidth: 0,
      inputDisabled: false,
      timeoutReference: null,
    };

    this.onUIChange = this.onUIChange.bind(this);
    this.overlayTarget = React.createRef();

    this.timeout = 6e2; // 600ms timeout for input typing
    this.doneTyping = this.doneTyping.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onUIChange);
    this.initInputWidth();
  }

  onUIChange(state) {
    let inputDisabled = false;
    let value = '';

    if (state.currentSearchSelection) {
      inputDisabled = true;
      let selection = state.currentSearchSelection;

      if (selection.search_by_method === "substring") {
        value = selection.name;
      } else {
        value = selection.search_by_method;
      }
    }

    this.setState({
      value: value,
      inputDisabled: inputDisabled
    });
  }

  initInputWidth() {
    const input = ReactDOM.findDOMNode(this.refs.input);
    if (input) {
      this.setState({ inputWidth: input.offsetWidth });
    }
  }

  focusNewSuggestionIndex(direction = 1) {
    let { suggestions, suggestionFocus } = this.state;
    let length = suggestions.length;
    let sF = suggestionFocus == null ? length - 1 : suggestionFocus;
    let newSuggestionIndex = sF + direction;
    if (newSuggestionIndex >= length) { newSuggestionIndex = 0; }
    if (newSuggestionIndex < 0) { newSuggestionIndex = length - 1; }
    this.focusSuggestion(newSuggestionIndex);
  }

  focusSuggestion(newFocus) {
    let { suggestions, suggestionFocus, value, valueBeforeFocus } = this.state;
    let newState = {};
    let sF = !suggestionFocus ? 0 : suggestionFocus;
    if (!valueBeforeFocus) {
      newState.valueBeforeFocus = value;
    }
    newState.value = suggestions[newFocus].name;

    if (!isString(newState.value)) {
      newState.value = suggestions[newFocus].name.name || suggestions[newFocus].name.value;
    }

    newState.suggestionFocus = newFocus;
    ReactDOM.findDOMNode(this.refs['suggestion_' + sF])
      .classList.remove('active');
    let newFocusDom = ReactDOM.findDOMNode(this.refs['suggestion_' + newFocus]);
    newFocusDom.classList.add('active');

    this.setState(newState);

    const listSuggestions = this.listSuggestions;

    // Scroll to element
    if (listSuggestions &&
      (newFocusDom.offsetTop > (listSuggestions.scrollTop + listSuggestions.offsetHeight - 70) ||
        (newFocusDom.offsetTop < listSuggestions.scrollTop))) {
      listSuggestions.scrollTop = newFocusDom.offsetTop - (11 * listSuggestions.offsetTop);
    }
  }

  resetComponent() {
    this.setState({
      value: '',
      valueBeforeFocus: null,
      showSuggestions: false,
      suggestions: null,
      suggestionFocus: null,
      error: ''
    });
  }

  // TODO implement continue fetching in the end of scroll
  fetchSuggestions(value, show = true) {
    let debounced = debounce(this.props.suggestions, 200);
    debounced(value).then(result => {
      let newState = {};
      if (result.length > 0) {
        newState.suggestions = result;
        newState.showSuggestions = show;
      } else {
        newState.suggestions = null;
        newState.error = "Nothing was found.";
        newState.suggestionFocus = null;
        newState.showSuggestions = false;
      }
      this.setState(newState);
    }).catch(error => console.log(error));
  }

  doneTyping() {
    let { value } = this.state;
    if (!value) {
      this.resetComponent();
    } else {
      // From https://gist.github.com/lsauer/1312860
      // TODO Validate if the input is InChi, InChiKey or SMILES
      this.fetchSuggestions(value);
    }
  }

  // Keep chaging the input value until user finish typing
  handleValueChange(event, doneTyping) {
    let { value } = event.target;
    let { timeoutReference, target } = this.state;

    if (!value) {
      this.resetComponent();
    } else {
      if (timeoutReference) {
        clearTimeout(timeoutReference);
      }

      this.setState({
        value: value,
        target: event.target,
        timeoutReference: setTimeout(function () {
          doneTyping();
        }, this.timeout)
      });
    }
  }

  handleKeyDown(event) {
    let { value, valueBeforeFocus, showSuggestions, error, suggestions } =
      this.state;
    let { onSelectionChange } = this.props;
    let newState = {};
    switch (event.keyCode) {
      case 13: // Enter
        this.selectSuggestion();
        event.preventDefault();
        break;
      case 27: // ESC
        this.abortAutoSelection();
        event.preventDefault();
        break;
      case 38: // Up
        if (showSuggestions && !error) {
          this.focusNewSuggestionIndex(-1);
        }
        event.preventDefault();
        break;
      case 40: // Down
        if (showSuggestions && !error) {
          this.focusNewSuggestionIndex(+1);
        } else if (suggestions) {
          newState.showSuggestions = true;
        }
        event.preventDefault();
        break;
    }
    this.setState(newState);
  }

  selectSuggestion() {
    let { suggestions, suggestionFocus, timeoutReference, value } = this.state;
    let { onSelectionChange } = this.props;
    this.setState({
      showSuggestions: false,
      valueBeforeFocus: null
    });
    if (!isString(value) && value) {
      value = value.name || value.value;
      this.setState({ value });
    }

    if (!value || value.trim() === '') {
      this.setState({
        value: ''
      });
      let { currentCollection } = UIStore.getState();
      currentCollection['clearSearch'] = true;
      UIActions.selectCollection(currentCollection);

      return 0;
    }

    if (UIStore.getState().currentSearchByID) {
      UIActions.clearSearchById();
    }

    let selection = { name: value, search_by_method: 'substring' };

    if (suggestions && suggestionFocus != null && suggestions[suggestionFocus]) {
      let selectedSuggestion = suggestions[suggestionFocus];
      let selectedName = selectedSuggestion.name;

      if (!isString(selectedName)) {
        selectedName = selectedName.name;
      }

      if (selectedName && selectedName.trim() != '' && this.state.value == selectedName)
        if (selectedSuggestion.search_by_method == 'element_short_label') {
          selection = { name: selectedSuggestion.name.name, search_by_method: `element_short_label_${selectedSuggestion.name.klass}` };

        } else {
          selection = selectedSuggestion;
        }
    }

    clearTimeout(timeoutReference);
    onSelectionChange(selection);
  }

  abortAutoSelection() {
    let { valueBeforeFocus } = this.state;
    this.setState({
      showSuggestions: false,
      value: valueBeforeFocus,
      valueBeforeFocus: null,
      suggestionFocus: null
    });
  }

  renderSuggestions() {
    const { suggestions, error } = this.state;
    const types = {
      sample_name: { icon: 'icon-sample', label: 'Sample Name' },
      sample_short_label: { icon: 'icon-sample', label: 'Sample Short Label' },
      sample_external_label: { icon: 'icon-sample', label: 'Sample External Label' },
      polymer_type: { icon: 'icon-polymer', label: 'Polymer' },
      reaction_name: { icon: 'icon-reaction', label: 'Reaction name' },
      reaction_status: { icon: 'icon-reaction', label: 'Reaction status' },
      reaction_short_label: { icon: 'icon-reaction', label: 'Reaction label' },
      reaction_rinchi_string: { icon: 'icon-reaction', label: 'Reaction RInChI' },
      wellplate_name: { icon: 'icon-wellplate', label: 'Wellplate' },
      screen_name: { icon: 'icon-screen', label: 'Screen' },
      iupac_name: { icon: 'icon-sample', label: 'Molecule' },
      inchistring: { icon: 'icon-sample', label: 'InChI' },
      inchikey: { icon: 'icon-sample', label: 'InChIKey' },
      cano_smiles: { icon: 'icon-sample', label: 'Canonical Smiles' },
      sum_formula: { icon: 'icon-sample', label: 'Sum Formula' },
      cas: { icon: 'icon-sample', label: 'cas' },
      molecule_name: { icon: 'icon-sample', label: 'Molecule name' },
      requirements: { icon: 'icon-screen', label: 'Requirement' },
      conditions: { icon: 'icon-screen', label: 'Condition' },
      element_short_label: { icon: 'icon-element', label: 'Element Short Label' },
      cell_line_material_name: { icon: 'icon-cell_line', label: 'Cell line name' },
      cell_line_sample_name: { icon: 'icon-cell_line', label: 'Cell line sample name' },
      sbmm_sample_name: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule Sample name' },
      sbmm_sample_short_label: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule Sample short label' },
      sbmm_sample_organism: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule Sample organism' },
      sbmm_sample_taxon_id: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule Sample taxon ID' },
      sbmm_sample_strain: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule Sample strain' },
      sbmm_sample_tissue: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule Sample tissue' },
      sbmm_systematic_name: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule full name' },
      sbmm_short_name: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule short name' },
      sbmm_other_identifier: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule other reference ID' },
      sbmm_own_identifier: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule own ID' },
      sbmm_ec_numbers: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule ec numbers' },
      sbmm_organism: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule organism' },
      sbmm_taxon_id: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule taxon ID' },
      sbmm_strain: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule strain' },
      sbmm_tissue: { icon: 'icon-sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule tissue' },
    };

    if (suggestions) {
      return (
        <div>
          {suggestions.map((suggestion, index) => {
            let suggestionType = types[suggestion.search_by_method];
            let icon = suggestionType ? suggestionType.icon : "";
            let typeLabel = suggestionType ? suggestionType.label : "";
            let name = '';

            // Remove first "InchI" string in suggestion list
            let inchiString = 'InChI=';
            let inchiMatch = '';

            if (suggestion.search_by_method === 'element_short_label') {
              icon = suggestion.name.icon;
              typeLabel = suggestion.name.label;
              name = suggestion.name.name;
            } else if (suggestion.search_by_method === 'cas') {
              name = suggestion.name.value;
            } else {
              name = suggestion.name;
              inchiMatch = suggestion.name.substring(0, inchiString.length);
              if (inchiMatch === inchiString) {
                suggestion.name = suggestion.name.replace(inchiString, "");
              }
            }

            return (
              <ListGroup.Item
                onClick={() => this.selectSuggestion()}
                onMouseEnter={() => this.focusSuggestion(index)}
                key={'suggestion_' + index}
                ref={'suggestion_' + index}
              >
                <h4 className="text-break">{name}</h4>
                <i className={`pe-1 ${icon}`}></i>
                {typeLabel}
              </ListGroup.Item>
            );
          })}
        </div>
      );
    } else if (error) {
      return <ListGroup.Item>{error}</ListGroup.Item>;
    }
    return <div />;
  }

  render() {
    const {
      value, showSuggestions, inputWidth, suggestions
    } = this.state;
    let scrollClass = '';
    if (suggestions && suggestions.length > 6) { // show scroll after 6 results
      scrollClass = ' overflow-y-scroll';
    }

    return (
      <div className="d-flex flex-column">
        <Form.Group ref={this.overlayTarget}>
          <InputGroup className="d-flex flex-nowrap z-4">
            {this.props.buttonBefore}
            <Form.Control
              placeholder="IUPAC, InChI, SMILES, RInChI..."
              style={{ minWidth: 200, maxWidth: 300 }}
              disabled={this.state.inputDisabled || this.props.inputDisabled}
              type="text"
              value={this.props.defaultSearchValue || value || ''}
              autoComplete="off"
              ref="input"
              onChange={event => this.handleValueChange(event, this.doneTyping)}
              onKeyDown={event => this.handleKeyDown(event)}
            />
            {this.props.buttonAfter}
          </InputGroup>
        </Form.Group>
        <Overlay
          show={showSuggestions}
          onHide={() => this.abortAutoSelection()}
          placement='bottom'
          container={this.overlayTarget.current}
          rootClose={true}
          target={this.state.target}
        >
          <div
            className="position-absolute" style={{ width: inputWidth, zIndex: 20 }}
          >
            <ListGroup
              className={scrollClass}
              style={{ maxHeight: 400, width: 400 }}
              ref={(alist) => { this.listSuggestions = alist; }}
            >
              <div className="w-100 text-bg-paper border overflow-auto">
                {this.renderSuggestions()}
              </div>
            </ListGroup>
          </div>
        </Overlay>
      </div>
    );
  }
}

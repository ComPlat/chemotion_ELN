import alt from '../alt';

import UIActions from './UIActions';
import UserActions from './UserActions';

import SamplesFetcher from '../fetchers/SamplesFetcher';
import MoleculesFetcher from '../fetchers/MoleculesFetcher';
import ResidueFetcher from '../fetchers/ResidueFetcher';
import ReactionsFetcher from '../fetchers/ReactionsFetcher';
import WellplatesFetcher from '../fetchers/WellplatesFetcher';
import CollectionsFetcher from '../fetchers/CollectionsFetcher';
import ReactionSvgFetcher from '../fetchers/ReactionSvgFetcher';
import ScreensFetcher from '../fetchers/ScreensFetcher';
import SearchFetcher from '../fetchers/SearchFetcher';

import Molecule from '../models/Molecule';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';

import Wellplate from '../models/Wellplate';
import Screen from '../models/Screen';

import _ from 'lodash';

class ElementActions {

  // -- Search --

  fetchBasedOnSearchSelectionAndCollection(selection, collectionId, currentPage) {
    return (dispatch) => { SearchFetcher.fetchBasedOnSearchSelectionAndCollection(selection, collectionId, currentPage)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  // -- Collections --


  fetchReactionsByCollectionId(id, queryParams={}) {
    return (dispatch) => { ReactionsFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }


  // -- Samples --

  fetchSampleById(id) {
    return (dispatch) => { SamplesFetcher.fetchById(id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchSamplesByCollectionId(id, queryParams={}) {
    return (dispatch) => { SamplesFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  createSample(params) {
    return (dispatch) => { SamplesFetcher.create(params)
      .then((result) => {
        dispatch(result)
      });};
  }

  createSampleForReaction(params) {
    return (dispatch) => { SamplesFetcher.create(params)
      .then((result) => {
        dispatch(result)
      });};
  }

  editReactionSample(reactionID, sampleID) {
    return (dispatch) => { SamplesFetcher.fetchById(sampleID)
      .then((result) => {
        dispatch({sample: result, reaction: reactionID });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateSampleForReaction(params) {
    return (dispatch) => { SamplesFetcher.update(params)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateSample(params) {
    return (dispatch) => { SamplesFetcher.update(params)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  generateEmptySample(collection_id) {
    return  Sample.buildEmpty(collection_id)
  }

  splitAsSubsamples(ui_state) {
    return (dispatch) => { SamplesFetcher.splitAsSubsamples(ui_state)
      .then((result) => {
        dispatch(ui_state);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  copySampleFromClipboard(collection_id) {
    return  collection_id;
  }

  addSampleToMaterialGroup(params) {
    return  params;
  }

  importSamplesFromFile(params) {
    return (dispatch) => { SamplesFetcher.importSamplesFromFile(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  // -- Molecules --

  fetchMoleculeByMolfile(molfile, svg_file = null) {
    return (dispatch) => { MoleculesFetcher.fetchByMolfile(molfile, svg_file)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  // -- Reactions --

  fetchReactionById(id) {
    return (dispatch) => { ReactionsFetcher.fetchById(id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  createReaction(params) {
    return (dispatch) => { ReactionsFetcher.create(params)
      .then((result) => {
        dispatch(result)
      });};
  }

  updateReaction(params) {
    return (dispatch) => { ReactionsFetcher.update(params)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  generateEmptyReaction(collection_id) {
    return  Reaction.buildEmpty(collection_id)
  }

  copyReactionFromId(id) {
    return (dispatch) => { ReactionsFetcher.fetchById(id)
    .then((result) => {
      dispatch(result);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });};
  }

  openReactionDetails(reaction) {
    return  reaction;
  }

  // -- Reactions SVGs --

  fetchReactionSvgByMaterialsSvgPaths(materialsSvgPaths, label){
    return (dispatch) => { ReactionSvgFetcher.fetchByMaterialsSvgPaths(materialsSvgPaths, label)
      .then((result) => {
        dispatch(result.reaction_svg);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  // -- Wellplates --

  bulkCreateWellplatesFromSamples(params) {
    let { collection_id, samples, wellplateCount } = params;

    // wellplateCount correction
    if(wellplateCount > Math.ceil(samples.length / 96)) {
      wellplateCount = Math.ceil(samples.length / 96)
    }

    // build wellplate objects from samples
    let wellplates = [];
    _.range(wellplateCount ).forEach((i) => {
      wellplates[i] = Wellplate.buildFromSamplesAndCollectionId(_.compact(samples.slice(96*i, 96*(i+1))), collection_id).serialize();
    });

    return (dispatch) => { WellplatesFetcher.bulkCreateWellplates({wellplates: wellplates})
      .then(() => {
        dispatch();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  generateWellplateFromClipboard(collection_id) {
    return  collection_id;
  }

  generateEmptyWellplate(collection_id) {
    return  Wellplate.buildEmpty(collection_id);
  }

  createWellplate(wellplate) {
    return (dispatch) => { WellplatesFetcher.create(wellplate)
      .then(result => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateWellplate(wellplate) {
    return (dispatch) => { WellplatesFetcher.update(wellplate)
      .then(result => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchWellplatesByCollectionId(id, queryParams={}) {
    return (dispatch) => { WellplatesFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchWellplateById(id) {
    return (dispatch) => { WellplatesFetcher.fetchById(id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }


  // -- Screens --

  generateScreenFromClipboard(collection_id) {
    return  collection_id;
  }


  fetchScreensByCollectionId(id, queryParams={}) {
    return (dispatch) => { ScreensFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchScreenById(id) {
    return (dispatch) => { ScreensFetcher.fetchById(id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  generateEmptyScreen(collection_id) {
    return  Screen.buildEmpty(collection_id);
  }

  createScreen(params) {
    return (dispatch) => { ScreensFetcher.create(params)
      .then(result => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateScreen(params) {
    return (dispatch) => { ScreensFetcher.update(params)
      .then(result => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  // -- General --

  refreshElements(type) {
    return  type
  }


  deleteElements(options) {
    return  (dispatch)=> {
    dispatch(options);
    UIActions.uncheckWholeSelection();
    UserActions.fetchCurrentUser();}
  }

  removeElements() {
    return  ;
  }

  // - ...

  deleteSamplesByUIState(ui_state) {
    return (dispatch) => { SamplesFetcher.deleteSamplesByUIState(ui_state)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  deleteReactionsByUIState(params) {
    return (dispatch) => { ReactionsFetcher.deleteReactionsByUIState(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  deleteWellplatesByUIState(ui_state) {
    return (dispatch) => { WellplatesFetcher.deleteWellplatesByUIState(ui_state)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  deleteScreensByUIState(ui_state) {
    return (dispatch) => { ScreensFetcher.deleteScreensByUIState(ui_state)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateElementsCollection(params) {
    return (dispatch) => { CollectionsFetcher.updateElementsCollection(params)
      .then(() => {
        dispatch(params);UIActions.uncheckWholeSelection();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  assignElementsCollection(params) {
    return (dispatch) => { CollectionsFetcher.assignElementsCollection(params)
      .then(() => {
        dispatch(params);UIActions.uncheckWholeSelection();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  removeElementsCollection(params) {
    return (dispatch) => { CollectionsFetcher.removeElementsCollection(params)
      .then(() => {
        dispatch(params);UIActions.uncheckWholeSelection();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

}

export default alt.createActions(ElementActions);

import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import SequenceBasedMacromoleculesFetcher from 'src/fetchers/SequenceBasedMacromoleculesFetcher';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import Container from 'src/models/Container';

const emptySequenceBasedMacromoleculeSample = {
  accessions: [],
  created_at: '',
  ec_numbers: '',
  full_name: '',
  heterologous_expression: '',
  id: '',
  link_uniprot: '',
  link_pdb: '',
  localisation: '',
  molecular_weight: '',
  organism: '',
  other_identifier: '',
  own_identifier: '',
  parent: '',
  pdb_doi: '',
  primary_accession: '',
  sbmm_subtype: '',
  sbmm_type: '',
  sequence: '',
  sequence_length: '',
  splitted_sequence: '',
  short_name: '',
  strain: '',
  taxon_id: '',
  tissue: '',
  uniprot_derivation: '',
  uniprot_source: '',
  updated_at: '',
  attachments: [],
  post_translational_modifications: {},
  protein_sequence_modifications: {},
};

const validationFields = [
  'sequence_based_macromolecule.sbmm_type',
  'sequence_based_macromolecule.uniprot_derivation',
  'sequence_based_macromolecule.primary_accession',
  'sequence_based_macromolecule.parent_identifier',
  'sequence_based_macromolecule.short_name',
  'sequence_based_macromolecule.molecular_weight',
  'sequence_based_macromolecule.post_translational_modifications.acetylation_lysin_number',
  'sequence_based_macromolecule.splitted_sequence',
];

const postModificationCheckboxWithDetailField = [
  'phosphorylation_enabled', 'glycosylation_enabled', 'acetylation_enabled',
  'hydroxylation_enabled', 'methylation_enabled', 'other_modifications_enabled',
];

const postModificationDetailFields = [
  'phosphorylation_ser_details', 'phosphorylation_thr_details', 'phosphorylation_tyr_details',
  'glycosylation_n_linked_asn_details', 'glycosylation_o_linked_lys_details', 'glycosylation_o_linked_ser_details',
  'glycosylation_o_linked_thr_details', 'acetylation_lysin_number',
  'hydroxylation_lys_details', 'hydroxylation_lys_details', 'hydroxylation_pro_details',
  'methylation_arg_details', 'methylation_glu_details', 'methylation_lys_details', 'other_modifications_details',
];

const proteinModificationCheckboxWithDetailField = [
  'modification_n_terminal', 'modification_c_terminal', 'modification_insertion',
  'modification_deletion', 'modification_mutation', 'modification_other',
];

export const SequenceBasedMacromoleculeSamplesStore = types
  .model({
    key_prefix: types.optional(types.string, 'sbmm'),
    open_sequence_based_macromolecule_samples: types.optional(types.optional(types.array(types.frozen({})), [])),
    sequence_based_macromolecule_sample: types.optional(types.frozen({}), {}),
    sequence_based_macromolecule_sample_checksum: types.optional(types.string, ''),
    updated_sequence_based_macromolecule_sample_id: types.optional(types.number, 0),
    active_tab_key: types.optional(types.string, 'properties'),
    toggable_contents: types.optional(types.frozen({}), {}),
    analysis_mode: types.optional(types.string, 'edit'),
    analysis_comment_box: types.optional(types.boolean, false),
    analysis_start_export: types.optional(types.boolean, false),
    attachment_editor: types.optional(types.boolean, false),
    attachment_extension: types.optional(types.frozen({}), {}),
    show_attachment_image_edit_modal: types.optional(types.boolean, false),
    attachment_selected: types.optional(types.frozen({}), {}),
    attachment_show_import_confirm: types.optional(types.array(types.frozen({})), []),
    attachment_filter_text: types.optional(types.string, ''),
    attachment_sort_by: types.optional(types.string, 'name'),
    attachment_sort_direction: types.optional(types.string, 'asc'),
    filtered_attachments: types.optional(types.array(types.frozen({})), []),
    show_search_result: types.optional(types.boolean, false),
    show_conflict_modal: types.optional(types.boolean, false),
    search_result: types.optional(types.array(types.frozen({})), []),
    conflict_sbmms: types.optional(types.array(types.frozen({})), []),
    show_search_options: types.optional(types.frozen({}), {}),
  })
  .actions(self => ({
    searchForSequenceBasedMacromolecule: flow(function* searchForSequenceBasedMacromolecule(search_term, search_field) {
      let result = yield SequenceBasedMacromoleculesFetcher.searchForSequenceBasedMacromolecule(search_term, search_field);
      if (result?.search_results) {
        if (result.search_results.length < 1) {
          self.setSearchResult([{ results: 'none' }]);
        } else {
          self.setSearchResult(result.search_results);
        }
      }
    }),
    getSequenceBasedMacromoleculeByIdentifier: flow(function* getSequenceBasedMacromoleculeByIdentifier(primary_accession, available_sources) {
      let result = yield SequenceBasedMacromoleculesFetcher.getSequenceBasedMacromoleculeByIdentifier(primary_accession, available_sources);

      if (result?.sequence_based_macromolecule) {
        self.setSbmmBySearchResultOrDND(result.sequence_based_macromolecule, 'parent', primary_accession);
      }
    }),
    getSequenceBasedMacromoleculeByIds: flow(function* getSequenceBasedMacromoleculeByIds(sbmm_id, conflicting_sbmm_id) {
      let result1 = yield SequenceBasedMacromoleculesFetcher.getSequenceBasedMacromoleculeByIdentifier(sbmm_id, 'eln');
      let result2 = yield SequenceBasedMacromoleculesFetcher.getSequenceBasedMacromoleculeByIdentifier(conflicting_sbmm_id, 'eln');
      if (result1 && result2) {
        self.conflict_sbmms = [result1.sequence_based_macromolecule, result2.sequence_based_macromolecule];
      }
    }),
    getLastObjectAndKeyByField(field, sequence_based_macromolecule_sample) {
      const fieldParts = field.split('.');
      const lastKey = fieldParts.pop();
      const lastObject = fieldParts.reduce(
        (accumulator, currentValue) => accumulator[currentValue] ??= {}, sequence_based_macromolecule_sample
      );
      return { lastObject, lastKey };
    },
    addSequenceBasedMacromoleculeSampleToOpen(sequence_based_macromolecule_sample) {
      let openSequenceBasedMacromoleculeSamples = [...self.open_sequence_based_macromolecule_samples];
      const index = openSequenceBasedMacromoleculeSamples.findIndex(s => s.id === sequence_based_macromolecule_sample.id);
      if (index === -1) { 
        self.setSequenceBasedMacromoleculeSample(sequence_based_macromolecule_sample, true);
        openSequenceBasedMacromoleculeSamples.push(self.sequence_based_macromolecule_sample);
        self.open_sequence_based_macromolecule_samples = openSequenceBasedMacromoleculeSamples;

      } else if (sequence_based_macromolecule_sample.id === self.updated_sequence_based_macromolecule_sample_id) {
        self.sequence_based_macromolecule_sample = sequence_based_macromolecule_sample;
        openSequenceBasedMacromoleculeSamples[index] = sequence_based_macromolecule_sample;
        self.open_sequence_based_macromolecule_samples = openSequenceBasedMacromoleculeSamples;

      } else {
        self.sequence_based_macromolecule_sample = openSequenceBasedMacromoleculeSamples[index];
      }
      if (self.show_search_options[self.sequence_based_macromolecule_sample.id] === undefined) {
        self.toggleSearchOptions(self.sequence_based_macromolecule_sample.id, false);
      }
      self.updated_sequence_based_macromolecule_sample_id = 0;
    },
    editSequenceBasedMacromoleculeSamples(sequence_based_macromolecule_sample) {
      let openSequenceBasedMacromoleculeSamples = [...self.open_sequence_based_macromolecule_samples];
      const index = openSequenceBasedMacromoleculeSamples.findIndex(s => s.id === sequence_based_macromolecule_sample.id);
      openSequenceBasedMacromoleculeSamples[index] = sequence_based_macromolecule_sample;
      self.open_sequence_based_macromolecule_samples = openSequenceBasedMacromoleculeSamples;
    },
    removeFromOpenSequenceBasedMacromoleculeSamples(sequence_based_macromolecule_sample) {
      const openSequenceBasedMacromoleculeSamples =
        self.open_sequence_based_macromolecule_samples.filter((s) => { return s.id !== sequence_based_macromolecule_sample.id });

      self.open_sequence_based_macromolecule_samples = openSequenceBasedMacromoleculeSamples;

      let contents = { ...self.toggable_contents };
      Object.keys(contents).map((key) => {
        if (key.startsWith(sequence_based_macromolecule_sample.id)) {
          delete contents[key];
        }
      });
      self.toggable_contents = contents;

      let searchOptions = { ...self.show_search_options };
      if (searchOptions[self.sequence_based_macromolecule_sample.id] !== undefined) {
        delete searchOptions[self.sequence_based_macromolecule_sample.id];
      }
      self.show_search_options = searchOptions;
    },
    setSbmmBySearchResultOrDND(selectedSbmm, fullSbmmOrParent, primary_accession) {
      let sequenceBasedMacromoleculeSample = { ...self.sequence_based_macromolecule_sample };
      let sbmm = sequenceBasedMacromoleculeSample.sequence_based_macromolecule;
      let uniprotDerivation = sbmm.uniprot_derivation;

      delete sbmm.parent_identifier;

      if (fullSbmmOrParent == 'full_sbmm') {
        uniprotDerivation = selectedSbmm.uniprot_derivation;
        if (uniprotDerivation == 'uniprot_modified') {
          sbmm.parent_identifier = selectedSbmm?.parent.id || selectedSbmm?.id;
        }

        Object.keys(emptySequenceBasedMacromoleculeSample).map((key) => {
          if (selectedSbmm[key] !== undefined) { sbmm[key] = selectedSbmm[key]; }
        });
      } else {
        if (uniprotDerivation === 'uniprot_modified') {
          if (!sbmm.parent) { sbmm.parent = {}; }
          sbmm.parent_identifier = primary_accession || selectedSbmm?.primary_accession || selectedSbmm?.id;
        }
        const sbmmOrParent = uniprotDerivation === 'uniprot_modified' ? sbmm?.parent : sbmm;

        Object.keys(emptySequenceBasedMacromoleculeSample).map((key) => {
          if (['post_translational_modifications', 'protein_sequence_modifications'].includes(key) && uniprotDerivation === 'uniprot_modified') {
            sbmm[key] = {};
            sbmmOrParent[key] = null;
            sbmmOrParent.parent = null;
          } else if (selectedSbmm[key] !== undefined) {
            sbmmOrParent[key] = selectedSbmm[key];
          }
        });
      }

      if (Object.keys(sequenceBasedMacromoleculeSample.errors).length >= 1) {
        sequenceBasedMacromoleculeSample = self.checkIfFieldsAreValid(sequenceBasedMacromoleculeSample);
      }
      self.setSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample);
    },
    setSequenceBasedMacromoleculeSample(sequence_based_macromolecule_sample, initial = false) {
      if (initial) {
        self.sequence_based_macromolecule_sample_checksum = sequence_based_macromolecule_sample._checksum;
      }
      sequence_based_macromolecule_sample.changed = false;
      const sequenceBasedMacromoleculeSample = new SequenceBasedMacromoleculeSample(sequence_based_macromolecule_sample);

      if (sequenceBasedMacromoleculeSample.checksum() !== self.sequence_based_macromolecule_sample_checksum
        || sequenceBasedMacromoleculeSample.isNew) {
        sequenceBasedMacromoleculeSample.changed = true;
      }

      self.sequence_based_macromolecule_sample = sequenceBasedMacromoleculeSample;

      if (!initial) {
        self.editSequenceBasedMacromoleculeSamples(sequenceBasedMacromoleculeSample);
      }
    },
    changeSequenceBasedMacromoleculeSample(field, value) {
      let sequenceBasedMacromoleculeSample = { ...self.sequence_based_macromolecule_sample };
      const { lastObject, lastKey } = self.getLastObjectAndKeyByField(field, sequenceBasedMacromoleculeSample);
      lastObject[lastKey] = value;

      if (lastKey === 'splitted_sequence') {
        lastObject['sequence'] = value.split(' ').join('');
      }

      if (lastKey === 'uniprot_derivation' && sequenceBasedMacromoleculeSample.is_new) {
        sequenceBasedMacromoleculeSample = self.resetSBMMAndErrors(sequenceBasedMacromoleculeSample);
      }

      if (postModificationCheckboxWithDetailField.includes(lastKey) && !value) {
        const key = lastKey.replace('_enabled', '');
        const detailFields = postModificationDetailFields.filter((f) => f.startsWith(key));
        detailFields.map((fieldKey) => {
          lastObject[fieldKey] = '';
        });
      }

      if (proteinModificationCheckboxWithDetailField.includes(lastKey) && !value) {
        const key = `${lastKey}_details`;
        lastObject[key] = '';
      }

      // sequenceBasedMacromoleculeSample.updated = false;
      if (Object.keys(sequenceBasedMacromoleculeSample.errors).length >= 1) {
        sequenceBasedMacromoleculeSample = self.checkIfFieldsAreValid(sequenceBasedMacromoleculeSample);
      }

      self.setSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample);
    },
    resetSBMMAndErrors(sbmmSample) {
      Object.keys(sbmmSample.sequence_based_macromolecule).map((key) => {
        if (['sbmm_type', 'sbmm_subtype', 'uniprot_derivation', 'search_field', 'search_term'].includes(key)) { return }
        if (['accessions', 'attachments'].includes(key)) {
          sbmmSample.sequence_based_macromolecule[key] = [];
        } else if (['post_translational_modifications', 'protein_sequence_modifications'].includes(key)) {
          sbmmSample.sequence_based_macromolecule[key] = {};
        } else {
          sbmmSample.sequence_based_macromolecule[key] = '';
        }
      });
      sbmmSample.errors = {};
      self.toggleSearchOptions(sbmmSample.id, true);
      return sbmmSample;
    },
    toggleContentsOnOpenDetail(sbmmSample, uniprotDerivationValue) {
      let contents = { ...self.toggable_contents };

      if (uniprotDerivationValue == 'uniprot_modified') {
        contents[`${sbmmSample.id}-reference`] = false;
      }
      if (uniprotDerivationValue == 'uniprot') {
        contents[`${sbmmSample.id}-reference`] = true;
      }
      if (uniprotDerivationValue != 'uniprot') {
        contents[`${sbmmSample.id}-sequence_modifications`] = true;
      }
      if (!self.toggable_contents.hasOwnProperty(`${sbmmSample.id}-dnd-reference`)
        && uniprotDerivationValue == 'uniprot_modified') {
        contents[`${sbmmSample.id}-dnd-reference`] = true;
      }
      self.toggable_contents = contents;
    },
    toggleContent(content, value) {
      let contents = { ...self.toggable_contents };
      contents[content] = value || !contents[content];
      self.toggable_contents = contents;
    },
    setUpdatedSequenceBasedMacromoleculeSampleId(value) {
      self.updated_sequence_based_macromolecule_sample_id = value;
    },
    setActiveTabKey(key) {
      self.active_tab_key = key;
    },
    changeAnalysisMode() {
      const mode = { edit: 'order', order: 'edit' }[self.analysis_mode];
      self.analysis_mode = mode;
    },
    addEmptyAnalysisContainer() {
      const container = Container.buildEmpty();
      container.container_type = "analysis"
      let sequenceBasedMacromoleculeSample = { ...self.sequence_based_macromolecule_sample };
      sequenceBasedMacromoleculeSample.container.children[0].children.push(container);
      self.setSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample);
      self.analysis_mode = 'edit';
    },
    changeAnalysisContainerContent(container) {
      let sequenceBasedMacromoleculeSample = { ...self.sequence_based_macromolecule_sample };
      const index = sequenceBasedMacromoleculeSample.container.children[0].children.findIndex((c) => c.id === container.id);
      sequenceBasedMacromoleculeSample.container.children[0].children[index] = container;
      self.setSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample);
    },
    changeAnalysisContainer(children) {
      let sequenceBasedMacromoleculeSample = { ...self.sequence_based_macromolecule_sample };
      sequenceBasedMacromoleculeSample.container.children[0].children = children;
      self.setSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample);
    },
    toggleAnalysisCommentBox() {
      self.analysis_comment_box = !self.analysis_comment_box;
    },
    changeAnalysisComment(e) {
      if (!e && !e?.target) { return null; }

      let sequenceBasedMacromoleculeSample = { ...self.sequence_based_macromolecule_sample };
      let container = { ...self.sequence_based_macromolecule_sample.container }
      container.description = e.target.value;
      sequenceBasedMacromoleculeSample.container = container;
      self.setSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample);
    },
    toggleAnalysisStartExport() {
      self.analysis_start_export = !self.analysis_start_export;
    },
    setAttachmentEditor(value) {
      self.attachment_editor = value;
    },
    setAttachmentExtension(value) {
      self.attachment_extension = value;
    },
    setFilteredAttachments(attachments) {
      self.filtered_attachments = attachments;
    },
    setShowImportConfirm(value) {
      self.attachment_show_import_confirm = value;
    },
    toogleAttachmentModal() {
      self.show_attachment_image_edit_modal = !self.show_attachment_image_edit_modal;
    },
    setAttachmentSelected(attachment) {
      self.attachment_selected = attachment;
    },
    setAttachmentFilterText(value) {
      self.attachment_filter_text = value;
    },
    setAttachmentSortBy(value) {
      self.attachment_sort_by = value;
    },
    setAttachmentSortDirectory(value) {
      self.attachment_sort_direction = value;
    },
    changeAttachment(index, key, value, initial = false) {
      let sequenceBasedMacromoleculeSample = { ...self.sequence_based_macromolecule_sample };
      let attachment = { ...self.sequence_based_macromolecule_sample.attachments[index] };
      attachment[key] = value;
      sequenceBasedMacromoleculeSample.attachments[index] = attachment;
      self.setFilteredAttachments(sequenceBasedMacromoleculeSample.attachments);
      self.setSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample, initial);
    },
    changeSBMMAttachment(index, key, value, initial = false) {
      let sequenceBasedMacromoleculeSample = { ...self.sequence_based_macromolecule_sample };
      let attachment = { ...self.sequence_based_macromolecule_sample.sequence_based_macromolecule.attachments[index] };
      attachment[key] = value;
      sequenceBasedMacromoleculeSample.sequence_based_macromolecule.attachments[index] = attachment;
      self.setSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample, initial);
    },
    openSearchResult() {
      self.show_search_result = true;
    },
    closeSearchResult() {
      self.show_search_result = false;
    },
    openConflictModal(sbmm_id, conflicting_sbmm_id) {
      self.show_conflict_modal = true;
      self.getSequenceBasedMacromoleculeByIds(sbmm_id, conflicting_sbmm_id);
    },
    closeConflictModal() {
      self.show_conflict_modal = false;
    },
    setSearchResult(result) {
      self.removeSearchResult();
      self.search_result = result;
    },
    removeSearchResult() {
      self.search_result = [];
    },
    toggleSearchOptions(id, value) {
      let searchOptions = { ...self.show_search_options };
      searchOptions[id] = value;
      self.show_search_options = searchOptions;
    },
    setModificationToggleButtons(fieldPrefix, field, fieldSuffix, value) {
      let sequenceBasedMacromoleculeSample = { ...self.sequence_based_macromolecule_sample };
      const { lastObject, lastKey } = self.getLastObjectAndKeyByField(fieldPrefix, sequenceBasedMacromoleculeSample);
      const detailField = field.replace('enabled', fieldSuffix);

      lastObject[lastKey][field] = value;

      if (!value) {
        lastObject[lastKey][detailField] = '';
      }

      self.setSequenceBasedMacromoleculeSample(sequenceBasedMacromoleculeSample);
    },
    setError(sbmmSample, errorPath, message) {
      errorPath.slice(0, -1).reduce((accumulator, key) => {
        if (!accumulator[key]) accumulator[key] = {};
        return accumulator[key];
      }, sbmmSample)[errorPath.at(-1)] = message;
    },
    removeError(sbmmSample, errorPath) {
      const errorField = errorPath.slice(0, -1).reduce((accumulator, key) => {
        return accumulator?.[key];
      }, sbmmSample);

      if (errorField && errorPath.at(-1) in errorField) {
        delete errorField[errorPath.at(-1)];
      }

      Object.entries(sbmmSample.errors).map(([key, value]) => {
        if (key == 'conflict') {
          delete sbmmSample.errors[key];
          return;
        }

        if (Object.keys(value).length === 0) {
          delete sbmmSample.errors[key];
        } else if (typeof value == 'object') {
          Object.entries(value).map(([k, v]) => {
            if (Object.keys(v).length === 0) {
              delete sbmmSample.errors[key][k];
              delete sbmmSample.errors[key];
            } else {
              if (sbmmSample[key] && sbmmSample[key][k] !== undefined && sbmmSample[key][k] !== '') {
                delete sbmmSample.errors[key][k];
              }
            }
          })
        }
      });
    },
    checkIfFieldsAreValid(sbmmSample) {
      const sbmm = sbmmSample.sequence_based_macromolecule;
      validationFields.forEach((key) => {
        const hasValue = key.split('.').reduce((accumulator, currentValue) => accumulator?.[currentValue], sbmmSample);
        const errorPath = `errors.${key}`.split('.');

        const isPrimaryAccession =
          self.sequence_based_macromolecule_sample.isNew && key.includes('primary_accession')
          && sbmm.uniprot_derivation == 'uniprot' && !sbmm.primary_accession;
        const isParentIdentifier =
          self.sequence_based_macromolecule_sample.isNew && key.includes('parent_identifier')
          && sbmm.uniprot_derivation == 'uniprot_modified' && !sbmm.parent_identifier;
        const hasNoLysinNumber = sbmm.post_translational_modifications && key.includes('acetylation_lysin_number')
          && sbmm.post_translational_modifications?.acetylation_enabled
          && !hasValue;
        const checkOnlyValue = !key.includes('primary_accession') && !key.includes('parent_identifier')
          && !key.includes('acetylation_lysin_number') && !hasValue;

        if (!isPrimaryAccession && !isParentIdentifier && !hasNoLysinNumber && !checkOnlyValue && hasValue) {
          self.removeError(sbmmSample, errorPath);
        } else if (isPrimaryAccession || isParentIdentifier) {
          self.setError(sbmmSample, errorPath, "Please choose a reference");
        } else if (hasNoLysinNumber) {
          self.setError(sbmmSample, errorPath, "Can't be blank");
        } else if (checkOnlyValue) {
          self.setError(sbmmSample, errorPath, "Can't be blank");
        }
      });

      return sbmmSample;
    },
    hasValidFields() {
      let sbmmSample = { ...self.sequence_based_macromolecule_sample };
      self.removeError(sbmmSample, ['errors', 'structure_file']);
      sbmmSample = self.checkIfFieldsAreValid(sbmmSample);

      self.setSequenceBasedMacromoleculeSample(sbmmSample);
      return Object.keys(sbmmSample.errors).length < 1 ? true : false;
    },
  }))
  .views(self => ({
    get filteredAttachments() { return values(self.filtered_attachments) },
    get searchResult() { return values(self.search_result) },
    get conflictSbmms() { return values(self.conflict_sbmms) },
    get shownGroups() { return values(self.shown_groups) },
    get openSbmmSamples() { return values(self.open_sequence_based_macromolecule_samples) }
  }));

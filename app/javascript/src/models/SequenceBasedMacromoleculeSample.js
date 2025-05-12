import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';
import { convertUnits, default_units } from 'src/components/staticDropdownOptions/units';

export default class SequenceBasedMacromoleculeSample extends Element {
  constructor(args) {
    let newArgs = args;
    if (!newArgs.is_new) {
      if (!newArgs._concentration_value || !newArgs._concentration_unit) {
        newArgs._concentration_value = newArgs.concentration_value;
        newArgs._concentration_unit = newArgs.concentration_unit;
      }
      if (!newArgs._molarity_value || !newArgs._molarity_unit) {
        newArgs._molarity_value = newArgs.molarity_value;
        newArgs._molarity_unit = newArgs.molarity_unit;
        newArgs._base_molarity_value = convertUnits(newArgs.molarity_value, newArgs.molarity_unit, default_units.molarity);
      }
      if (!newArgs._activity_value || !newArgs._activity_unit) {
        newArgs._activity_value = newArgs.activity_value;
        newArgs._activity_unit = newArgs.activity_unit;
        newArgs._base_activity_value = convertUnits(newArgs.activity_value, newArgs.activity_unit, default_units.activity);
      }
      if (!newArgs._activity_per_mass_value || !newArgs._activity_per_mass_unit) {
        newArgs._activity_per_mass_value = newArgs.activity_per_mass_value;
        newArgs._activity_per_mass_unit = newArgs.activity_per_mass_unit;
        newArgs._base_activity_per_mass_value =
          convertUnits(newArgs.activity_per_mass_value, newArgs.activity_per_mass_unit, default_units.activity_per_mass);
      }
      if (!newArgs._activity_per_volume_value || !newArgs._activity_per_volume_unit) {
        newArgs._activity_per_volume_value = newArgs.activity_per_volume_value;
        newArgs._activity_per_volume_unit = newArgs.activity_per_volume_unit;
        newArgs._base_activity_per_volume_value =
          convertUnits(newArgs.activity_per_volume_value, newArgs.activity_per_volume_unit, default_units.activity_per_volume);
      }
      if (!newArgs._volume_as_used_value || !newArgs._volume_as_used_unit) {
        newArgs._volume_as_used_value = newArgs.volume_as_used_value;
        newArgs._volume_as_used_unit = newArgs.volume_as_used_unit;
        newArgs._base_volume_as_used_value =
          convertUnits(newArgs.volume_as_used_value, newArgs.volume_as_used_unit, default_units.volume_as_used);
      }
      if (!newArgs._amount_as_used_mass_value || !newArgs._amount_as_used_mass_unit) {
        newArgs._amount_as_used_mass_value = newArgs.amount_as_used_mass_value;
        newArgs._amount_as_used_mass_unit = newArgs.amount_as_used_mass_unit;
        newArgs._base_amount_as_used_mass_value =
          convertUnits(newArgs.amount_as_used_mass_value, newArgs.amount_as_used_mass_unit, default_units.amount_as_used_mass);
      }
      if (!newArgs._amount_as_used_mol_value || !newArgs._amount_as_used_mol_unit) {
        newArgs._amount_as_used_mol_value = newArgs.amount_as_used_mol_value;
        newArgs._amount_as_used_mol_unit = newArgs.amount_as_used_mol_unit;
        newArgs._base_amount_as_used_mol_value =
          convertUnits(newArgs.amount_as_used_mol_value, newArgs.amount_as_used_mol_unit, default_units.amount_as_used_mol);
      }
    }
    super(newArgs);
  }

  calculateValues(type) {
    // if the volume is added, we calculate the activity and the amount based on: 
    //   amount [mol] = Volume [L] * molarity [mol/L] 
    //   activity [U] = Volume [L] * activity_per_liter [U/L] 
    // if the activity is added: 
    //   Volume [L] = Activity [U] / activity_per_liter [U/L] 
    //   amount [mol] = Volume [L] * molarity [mol/L]   
    // if the amount (in mol) is added: 
    //   volume [L] = amount [mol]  / molarity [mol/L] 
    //   activity [U] = Volume [L] * activity_per_liter [U/L] 
    // if the amount (in g) is added: 
    //   Activity [U] = amount [g] * Activity in U/g [mol/L]

    if (!this.function_or_application || this.function_or_application !== 'enzyme') { return null; }

    if (type === 'volume_as_used' && this.base_volume_as_used_value > 0) {
      this.calculateAmountAsUsed();
      this.calculateActivity();
    }

    if (type === 'activity' && this._base_activity_value > 0) {
      this.calculateVolumeByActivity();
      this.calculateAmountAsUsed();
    }

    if (type === 'amount_as_used_mol' && this.base_amount_as_used_mol_value > 0) {
      this.calculateVolumeByAmount();
      this.calculateActivity();
    }

    if (type === 'amount_as_used_mass' && this.base_amount_as_used_mass_value > 0) {
      this.calculateActivityByMass();
    }

    if (type === 'molarity' && this.base_molarity_value > 0) {
      this.calculateAmountAsUsed();
    }

    if (type === 'activity_per_volume' && this.base_activity_per_volume_value > 0) {
      this.calculateActivity();
    }

    if (type === 'activity_per_mass' && this.base_activity_per_mass_value > 0) {
      this.calculateActivityByMass();
    }
  }

  calculateActivity() {
    if (this.base_activity_per_volume_value === 0 || this.base_volume_as_used_value === 0) { return null; }

    this._activity_value = convertUnits(
      parseFloat((this.base_volume_as_used_value * this.base_activity_per_volume_value).toFixed(8)),
      default_units.activity,
      this.activity_unit
    );
    this._base_activity_value =
      convertUnits(this._activity_value, this.activity_unit, default_units.activity);
  }

  calculateActivityByMass() {
    if (this.base_activity_per_mass_value === 0 || this.base_amount_as_used_mass_value === 0) { return null; }

    this._activity_value = convertUnits(
      parseFloat((this.base_amount_as_used_mass_value * this.base_activity_per_mass_value).toFixed(8)),
      default_units.activity,
      this.activity_unit
    );
    this._base_activity_value =
      convertUnits(this._activity_value, this.activity_unit, default_units.activity);
  }

  calculateAmountAsUsed() {
    if (this.base_volume_as_used_value === 0 || this.base_molarity_value === 0 || this._amount_as_used_mass_value > 0) {
      return null;
    }

    this._amount_as_used_mol_value = convertUnits(
      parseFloat((this.base_volume_as_used_value * this.base_molarity_value).toFixed(8)),
      default_units.amount_as_used_mol,
      this.amount_as_used_mol_unit
    );
    this._base_amount_as_used_mol_value =
      convertUnits(this._amount_as_used_mol_value, this.amount_as_used_mol_unit, default_units.amount_as_used_mol);
  }

  calculateVolumeByActivity() {
    if (this.base_activity_per_volume_value === 0 || this.base_activity_value === 0) { return null; }

    this._volume_as_used_value = convertUnits(
      parseFloat((this.base_activity_value / this.base_activity_per_volume_value).toFixed(8)),
      default_units.volume_as_used,
      this.volume_as_used_unit
    );
    this._base_volume_as_used_value =
      convertUnits(this._volume_as_used_value, this.volume_as_used_unit, default_units.volume_as_used);
  }

  calculateVolumeByAmount() {
    if (this.base_molarity_value === 0 || this.base_amount_as_used_mol_value === 0) { return null; }

    this._volume_as_used_value = convertUnits(
      parseFloat((this.base_amount_as_used_mol_value / this.base_molarity_value).toFixed(8)),
      default_units.volume_as_used,
      this.volume_as_used_unit
    );
    this._base_volume_as_used_value =
      convertUnits(this._volume_as_used_value, this.volume_as_used_unit, default_units.volume_as_used);
  }

  get activity_value() {
    return this._activity_value;
  }

  set activity_value(value) {
    this._activity_value = value;
    this._base_activity_value = convertUnits(this.activity_value, this.activity_unit, default_units.activity);
    this.calculateValues('activity');
  }

  get base_activity_value() {
    return this._base_activity_value || 0;
  }

  set base_activity_value(value) {
    this._base_activity_value = value;
  }

  get activity_unit() {
    return this._activity_unit || default_units.activity;
  }

  set activity_unit(value) {
    this._activity_value = convertUnits(this.activity_value, this.activity_unit, value);
    this._activity_unit = value;
  }

  get amount_as_used_mol_value() {
    return this._amount_as_used_mol_value;
  }

  set amount_as_used_mol_value(value) {
    this._amount_as_used_mol_value = value;
    this._base_amount_as_used_mol_value =
      convertUnits(this.amount_as_used_mol_value, this.amount_as_used_mol_unit, default_units.amount_as_used_mol);

    if (this.amount_as_used_mass_value !== undefined && value) {
      this._amount_as_used_mass_value = '';
      this._base_amount_as_used_mass_value = 0;
    }

    this.calculateValues('amount_as_used_mol');
  }

  get base_amount_as_used_mol_value() {
    return this._base_amount_as_used_mol_value || 0;
  }

  set base_amount_as_used_mol_value(value) {
    this._base_amount_as_used_mol_value = value;
  }

  get amount_as_used_mol_unit() {
    return this._amount_as_used_mol_unit || default_units.amount_as_used_mol;
  }

  set amount_as_used_mol_unit(value) {
    this._amount_as_used_mol_value = convertUnits(this.amount_as_used_mol_value, this.amount_as_used_mol_unit, value);
    this._amount_as_used_mol_unit = value;
  }

  get amount_as_used_mass_value() {
    return this._amount_as_used_mass_value;
  }

  set amount_as_used_mass_value(value) {
    this._amount_as_used_mass_value = value;
    this._base_amount_as_used_mass_value =
      convertUnits(this.amount_as_used_mass_value, this.amount_as_used_mass_unit, default_units.amount_as_used_mass);

    if (this.amount_as_used_mol_value !== undefined && value) {
      this._amount_as_used_mol_value = '';
      this._base_amount_as_used_mol_value = 0;
    }

    this.calculateValues('amount_as_used_mass');
  }

  get base_amount_as_used_mass_value() {
    return this._base_amount_as_used_mass_value || 0;
  }

  set base_amount_as_used_mass_value(value) {
    this._base_amount_as_used_mass_value = value;
  }

  get amount_as_used_mass_unit() {
    return this._amount_as_used_mass_unit || default_units.amount_as_used_mass;
  }

  set amount_as_used_mass_unit(value) {
    this._amount_as_used_mass_value = convertUnits(this.amount_as_used_mass_value, this.amount_as_used_mass_unit, value);
    this._amount_as_used_mass_unit = value;
  }

  get concentration_value() {
    return this._concentration_value;
  }

  set concentration_value(value) {
    this._concentration_value = value;
  }

  get concentration_unit() {
    return this._concentration_unit || default_units.concentration;
  }

  set concentration_unit(value) {
    this._concentration_value = convertUnits(this.concentration_value, this.concentration_unit, value);
    this._concentration_unit = value;
  }

  get function_or_application() {
    return this._function_or_application;
  }

  set function_or_application(value) {
    this._function_or_application = value;
  }

  get molarity_value() {
    return this._molarity_value;
  }

  set molarity_value(value) {
    this._molarity_value = value;
    this._base_molarity_value = convertUnits(this.molarity_value, this.molarity_unit, default_units.molarity);
    this.calculateValues('molarity');
  }

  get base_molarity_value() {
    return this._base_molarity_value || 0;
  }

  set base_molarity_value(value) {
    this._base_molarity_value = value;
  }

  get molarity_unit() {
    return this._molarity_unit || default_units.molarity;
  }

  set molarity_unit(value) {
    this._molarity_value = convertUnits(this.molarity_value, this.molarity_unit, value);
    this._molarity_unit = value;
  }

  get activity_per_volume_value() {
    return this._activity_per_volume_value;
  }

  set activity_per_volume_value(value) {
    this._activity_per_volume_value = value;
    this._base_activity_per_volume_value =
      convertUnits(this.activity_per_volume_value, this.activity_per_volume_unit, default_units.activity_per_volume);
    
    if (this.activity_per_mass_value !== undefined && value) {
      this._activity_per_mass_value = '';
      this._base_activity_per_mass_value = 0;
    }
    this.calculateValues('activity_per_volume');
  }

  get base_activity_per_volume_value() {
    return this._base_activity_per_volume_value || 0;
  }

  set base_activity_per_volume_value(value) {
    this._base_activity_per_volume_value = value;
  }

  get activity_per_volume_unit() {
    return this._activity_per_volume_unit || default_units.activity_per_volume;
  }

  set activity_per_volume_unit(value) {
    this._activity_per_volume_value = convertUnits(this.activity_per_volume_value, this.activity_per_volume_unit, value);
    this._activity_per_volume_unit = value;
  }

  get activity_per_mass_value() {
    return this._activity_per_mass_value;
  }

  set activity_per_mass_value(value) {
    this._activity_per_mass_value = value;
    this._base_activity_per_mass_value =
      convertUnits(this.activity_per_mass_value, this.activity_per_mass_unit, default_units.activity_per_mass);
    
    if (this.activity_per_volume_value !== undefined && value) {
      this._activity_per_volume_value = '';
      this._base_activity_per_volume_value = 0;
    }

    this.calculateValues('activity_per_mass');
  }

  get base_activity_per_mass_value() {
    return this._base_activity_per_mass_value || 0;
  }

  set base_activity_per_mass_value(value) {
    this._base_sactivity_per_mass_value = value;
  }

  get activity_per_mass_unit() {
    return this._activity_per_mass_unit || default_units.activity_per_mass;
  }

  set activity_per_mass_unit(value) {
    this._activity_per_mass_value = convertUnits(this.activity_per_mass_value, this.activity_per_mass_unit, value);
    this._activity_per_mass_unit = value;
  }

  get volume_as_used_value() {
    return this._volume_as_used_value;
  }

  set volume_as_used_value(value) {
    this._volume_as_used_value = value;
    this._base_volume_as_used_value =
      convertUnits(this.volume_as_used_value, this.volume_as_used_unit, default_units.volume_as_used);
    this.calculateValues('volume_as_used');
  }

  get base_volume_as_used_value() {
    return this._base_volume_as_used_value || 0;
  }

  set base_volume_as_used_value(value) {
    this._base_volume_as_used_value = value;
  }

  get volume_as_used_unit() {
    return this._volume_as_used_unit || default_units.volume_as_used;
  }

  set volume_as_used_unit(value) {
    this._volume_as_used_value = convertUnits(this.volume_as_used_value, this.volume_as_used_unit, value);
    this._volume_as_used_unit = value;
  }

  get accessions() {
    const accessions = this.sequence_based_macromolecule.accessions;
    if (accessions) {
      return [accessions.join(',')];
    } else {
      return [];
    }
  }

  get ec_numbers() {
    const ecNumbers = this.sequence_based_macromolecule.ec_numbers;
    if (ecNumbers) {
      return [ecNumbers.join(',')]
    } else {
      return [];
    }
  }

  static buildEmpty(collectionID) {
    return new SequenceBasedMacromoleculeSample({
      collection_id: collectionID,
      type: 'sequence_based_macromolecule_sample',
      name: 'New sequence based macromolecule',
      short_label: '',
      external_label: '',
      activity_per_mass_unit: 'U/g',
      activity_per_mass_value: '',
      activity_per_volume_unit: 'U/L',
      activity_per_volume_value: '',
      activity_unit: 'U',
      activity_value: '',
      amount_as_used_mass_unit: 'g',
      amount_as_used_mass_value: '',
      amount_as_used_mol_unit: 'mol',
      amount_as_used_mol_value: '',
      concentration_unit: 'ng/L',
      concentration_value: '',
      function_or_application: '',
      molarity_unit: 'mol/L',
      molarity_value: '',
      volume_as_used_unit: 'L',
      volume_as_used_value: '',
      
      sequence_based_macromolecule: {
        accessions: [],
        ec_numbers: '',
        full_name: '',
        heterologous_expression: '',
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
        short_name: '',
        strain: '',
        taxon_id: '',
        tissue: '',
        uniprot_derivation: '',
        uniprot_source: '',
        attachments: [],

        post_translational_modifications: {
          acetylation_enabled: false,
          acetylation_lysin_number: '',
          glycosylation_enabled: false,
          glycosylation_n_linked_asn_details: '',
          glycosylation_n_linked_asn_enabled: false,
          glycosylation_o_linked_lys_details: '',
          glycosylation_o_linked_lys_enabled: false,
          glycosylation_o_linked_ser_details: '',
          glycosylation_o_linked_ser_enabled: false,
          glycosylation_o_linked_thr_details: '',
          glycosylation_o_linked_thr_enabled: false,
          hydroxylation_enabled: false,
          hydroxylation_lys_details: '',
          hydroxylation_lys_enabled: false,
          hydroxylation_pro_details: '',
          hydroxylation_pro_enabled: false,
          methylation_arg_details: '',
          methylation_arg_enabled: false,
          methylation_enabled: false,
          methylation_glu_details: '',
          methylation_glu_enabled: false,
          methylation_lys_details: '',
          methylation_lys_enabled: false,
          other_modifications_details: '',
          other_modifications_enabled: false,
          phosphorylation_enabled: false,
          phosphorylation_ser_details: '',
          phosphorylation_ser_enabled: false,
          phosphorylation_thr_details: '',
          phosphorylation_thr_enabled: false,
          phosphorylation_tyr_details: '',
          phosphorylation_tyr_enabled: false,
        },
        protein_sequence_modifications: {
          modification_n_terminal: false,
          modification_n_terminal_details: '',
          modification_c_terminal: false,
          modification_c_terminal_details: '',
          modification_insertion: false,
          modification_insertion_details: '',
          modification_deletion: false,
          modification_deletion_details: '',
          modification_mutation: false,
          modification_mutation_details: '',
          modification_other: false,
          modification_other_details: '',
        },
      },

      isNew: true,
      changed: false,
      updated: false,
      can_copy: false,
      container: Container.init(),
      attachments: [],
    });
  }

  serialize() {
    const serialized = {
      collection_id: this.collection_id,
      name: this.name,
      short_label: this.short_label,
      activity_value: this.activity_value,
      activity_unit: this.activity_unit,
      amount_as_used_mol_value: this.amount_as_used_mol_value,
      amount_as_used_mol_unit: this.amount_as_used_mol_unit,
      amount_as_used_mass_value: this.amount_as_used_mass_value,
      amount_as_used_mass_unit: this.amount_as_used_mass_unit,
      concentration_value: this.concentration_value,
      concentration_unit: this.concentration_unit,
      container: this.container,
      function_or_application: this.function_or_application,
      molarity_value: this.molarity_value,
      molarity_unit: this.molarity_unit,
      activity_per_mass_value: this.activity_per_mass_value,
      activity_per_mass_unit: this.activity_per_mass_unit,
      activity_per_volume_value: this.activity_per_volume_value,
      activity_per_volume_unit: this.activity_per_volume_unit,
      volume_as_used_value: this.volume_as_used_value,
      volume_as_used_unit: this.volume_as_used_unit,
      sequence_based_macromolecule_attributes: {
        accessions: this.accessions,
        ec_numbers: this.ec_numbers,
        full_name: this.sequence_based_macromolecule.full_name,
        heterologous_expression: this.sequence_based_macromolecule.heterologous_expression || 'unknown',
        id: this.sequence_based_macromolecule.id,
        link_uniprot: this.sequence_based_macromolecule.link_uniprot,
        link_pdb: this.sequence_based_macromolecule.link_pdb,
        localisation: this.sequence_based_macromolecule.localisation,
        molecular_weight: this.sequence_based_macromolecule.molecular_weight,
        organism: this.sequence_based_macromolecule.organism,
        other_identifier: this.sequence_based_macromolecule.other_identifier,
        own_identifier: this.sequence_based_macromolecule.own_identifier,
        parent: this.sequence_based_macromolecule.parent,
        parent_identifier: this.sequence_based_macromolecule?.parent_identifier || this.sequence_based_macromolecule.parent?.id || '',
        pdb_doi: this.sequence_based_macromolecule.pdb_doi,
        primary_accession: this.sequence_based_macromolecule.primary_accession,
        sbmm_subtype: this.sequence_based_macromolecule.sbmm_subtype,
        sbmm_type: this.sequence_based_macromolecule.sbmm_type,
        sequence: this.sequence_based_macromolecule.sequence,
        short_name: this.sequence_based_macromolecule.short_name,
        strain: this.sequence_based_macromolecule.strain,
        taxon_id: this.sequence_based_macromolecule.taxon_id,
        tissue: this.sequence_based_macromolecule.tissue,
        uniprot_derivation: this.sequence_based_macromolecule.uniprot_derivation,
        uniprot_source: this.sequence_based_macromolecule.uniprot_source,

        post_translational_modification_attributes: this.sequence_based_macromolecule.post_translational_modifications,
        protein_sequence_modification_attributes: this.sequence_based_macromolecule.protein_sequence_modifications,
        attachments: this.sequence_based_macromolecule.attachments,
      },
    };
    return serialized;
  }

  serializeForCopy() {
    const serialized = {
      collection_id: this.collection_id,
      type: 'sequence_based_macromolecule_sample',
      name: this.name,
      short_label: this.short_label,
      activity_value: this.activity_value,
      activity_unit: this.activity_unit,
      amount_as_used_mol_value: this.amount_as_used_mol_value,
      amount_as_used_mol_unit: this.amount_as_used_mol_unit,
      amount_as_used_mass_value: this.amount_as_used_mass_value,
      amount_as_used_mass_unit: this.amount_as_used_mass_unit,
      concentration_value: this.concentration_value,
      concentration_unit: this.concentration_unit,
      container: this.container,
      function_or_application: this.function_or_application,
      molarity_value: this.molarity_value,
      molarity_unit: this.molarity_unit,
      activity_per_mass_value: this.activity_per_mass_value,
      activity_per_mass_unit: this.activity_per_mass_unit,
      activity_per_volume_value: this.activity_per_volume_value,
      activity_per_volume_unit: this.activity_per_volume_unit,
      volume_as_used_value: this.volume_as_used_value,
      volume_as_used_unit: this.volume_as_used_unit,
      sequence_based_macromolecule: this.sequence_based_macromolecule,
    };
    return serialized;
  }

  static buildNewShortLabel() {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return 'NEW SEQUENCE BASED MACROMOLECULE'; }
    return `${currentUser.initials}-SBMMS${currentUser.sequence_based_macromolecule_samples_count + 1}`;
  }

  static copyFromSequenceBasedMacromoleculeSampleAndCollectionId(sequence_based_macromolecule_sample, collection_id) {
    const newSequenceBasedMacromoleculeSample = sequence_based_macromolecule_sample.buildCopy();
    newSequenceBasedMacromoleculeSample.collection_id = collection_id;
    if (sequence_based_macromolecule_sample.name) { newSequenceBasedMacromoleculeSample.name = sequence_based_macromolecule_sample.name; }

    return newSequenceBasedMacromoleculeSample;
  }

  title() {
    const short_label = this.short_label ? this.short_label : '';
    return this.name ? `${short_label} ${this.name}` : short_label;
  }

  get attachmentCount() {
    if (this.attachments) { return this.attachments.length; }
    return this.attachment_count;
  }

  getAttachmentByIdentifier(identifier) {
    return this.attachments
      .filter((attachment) => attachment.identifier === identifier)[0];
  }

  buildCopy() {
    const sequenceBasedMacromoleculeSample = super.buildCopy();
    sequenceBasedMacromoleculeSample.short_label = SequenceBasedMacromoleculeSample.buildNewShortLabel();
    sequenceBasedMacromoleculeSample.container = Container.init();
    sequenceBasedMacromoleculeSample.can_copy = false;
    sequenceBasedMacromoleculeSample.attachments = [];
    if (sequenceBasedMacromoleculeSample.sequence_based_macromolecule.uniprot_derivation == 'uniprot_modified') {
      sequenceBasedMacromoleculeSample.sequence_based_macromolecule.parent_identifier =
        sequenceBasedMacromoleculeSample.sequence_based_macromolecule.parent.id;
    }
    return sequenceBasedMacromoleculeSample;
  }
}

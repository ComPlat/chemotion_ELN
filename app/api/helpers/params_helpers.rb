module ParamsHelpers
  extend Grape::API::Helpers

  params :ui_state_params do
    optional :checkedAll, type: Boolean, default: false
    optional :checkedIds, type: Array, default: []
    optional :uncheckedIds, type: Array, default: []
    # legacy
    optional :all, type: Boolean, default: false
    optional :included_ids, type: Array, default: []
    optional :excluded_ids, type: Array, default: []
    optional :collection_id, type: Integer
    optional :is_sync_to_me, type: Boolean, default: false
  end

  params :main_ui_state_params do
    requires :currentCollection, type: Hash do
      requires :id, type: Integer
      optional :is_sync_to_me, type: Boolean, default: false
      optional :is_shared, type: Boolean, default: false
    end
    optional :sample, type: Hash do
      use :ui_state_params
    end
    optional :reaction, type: Hash do
      use :ui_state_params
    end
    optional :wellplate, type: Hash do
      use :ui_state_params
    end
    optional :screen, type: Hash do
      use :ui_state_params
    end
    optional :research_plan, type: Hash do
      use :ui_state_params
    end
  end

  params :common_container_params do
    optional :id, type: Integer
    optional :name, type: String
    optional :container_type, type: String
    optional :description
    optional :extended_metadata
    optional :is_new, coerce: Boolean
    optional :is_deleted, coerce: Boolean
    optional :_checksum, type: String
    optional :code_log

    optional :attachments, type: Array
  end

  params :root_container_params do
    requires :container, type: Hash do
      use :common_container_params
      optional :children, type: Array do
        use :common_container_params
        optional :children, type: Array do
          use :common_container_params
          optional :children, type: Array do
            optional :name, type: String
            optional :container_type, type: String
            optional :description
            optional :extended_metadata
            optional :is_new # , type: Boolean
            optional :is_deleted # , type: Boolean
            optional :attachments, type: Array
            optional :_checksum, type: String
            optional :code_log
            #   optional :children
          end
        end
      end
    end
  end

  params :protein_sequence_modification_params do
    optional :modification_n_terminal, type: Boolean, default: false
    optional :modification_n_terminal_details, type: String
    optional :modification_c_terminal, type: Boolean, default: false
    optional :modification_c_terminal_details, type: String
    optional :modification_insertion, type: Boolean, default: false
    optional :modification_insertion_details, type: String
    optional :modification_deletion, type: Boolean, default: false
    optional :modification_deletion_details, type: String
    optional :modification_mutation, type: Boolean, default: false
    optional :modification_mutation_details, type: String
    optional :modification_other, type: Boolean, default: false
    optional :modification_other_details, type: String
  end

  params :post_translational_modification_params do
    optional :phosphorylation_enabled, type: Boolean, default: false
    optional :phosphorylation_ser_enabled, type: Boolean, default: false
    optional :phosphorylation_ser_details, type: String, default: ''
    optional :phosphorylation_thr_enabled, type: Boolean, default: false
    optional :phosphorylation_thr_details, type: String, default: ''
    optional :phosphorylation_tyr_enabled, type: Boolean, default: false
    optional :phosphorylation_tyr_details, type: String, default: ''

    optional :glycosylation_enabled, type: Boolean, default: false
    optional :glycosylation_n_linked_asn_enabled, type: Boolean, default: false
    optional :glycosylation_n_linked_asn_details, type: String, default: ''
    optional :glycosylation_o_linked_lys_enabled, type: Boolean, default: false
    optional :glycosylation_o_linked_lys_details, type: String, default: ''
    optional :glycosylation_o_linked_ser_enabled, type: Boolean, default: false
    optional :glycosylation_o_linked_ser_details, type: String, default: ''
    optional :glycosylation_o_linked_thr_enabled, type: Boolean, default: false
    optional :glycosylation_o_linked_thr_details, type: String, default: ''

    optional :acetylation_enabled, type: Boolean, default: false
    given(acetylation_enabled: ->(value) { value == true }) do
      requires :acetylation_lysin_number, type: Float, allow_blank: false
    end

    optional :hydroxylation_enabled, type: Boolean, default: false
    optional :hydroxylation_lys_enabled, type: Boolean, default: false
    optional :hydroxylation_lys_details, type: String, default: ''
    optional :hydroxylation_pro_enabled, type: Boolean, default: false
    optional :hydroxylation_pro_details, type: String, default: ''

    optional :methylation_enabled, type: Boolean, default: false
    optional :methylation_arg_enabled, type: Boolean, default: false
    optional :methylation_arg_details, type: String, default: ''
    optional :methylation_glu_enabled, type: Boolean, default: false
    optional :methylation_glu_details, type: String, default: ''
    optional :methylation_lys_enabled, type: Boolean, default: false
    optional :methylation_lys_details, type: String, default: ''

    optional :other_modifications_enabled, type: Boolean, default: false
    optional :other_modifications_details, type: String, default: ''
  end

  params :sbmm_params do
    requires :sbmm_type, type: String, desc: 'SBMM Type', values: %w[protein], allow_blank: false
    optional :sbmm_subtype, type: String, desc: 'SBMM Subtype', values: %w[unmodified glycoprotein], allow_blank: true
    requires :uniprot_derivation, type: String, desc: 'Existence in Uniprot', values: %w[uniprot uniprot_modified uniprot_unknown], allow_blank: false

    optional :other_identifier, type: String, desc: 'Freetext field for a custom external identifier'

    given(uniprot_derivation: ->(derivation) { derivation == 'uniprot' }) do
      requires :primary_accession, type: String, desc: 'Uniprot accession code', allow_blank: false
    end
    given(uniprot_derivation: ->(derivation) { derivation == 'uniprot_modified' }) do
      requires :parent_identifier, type: String, desc: 'Uniprot accession or SBMM ID of parent record', allow_blank: false
    end

    given(uniprot_derivation: ->(derivation) { derivation != 'uniprot' }) do
      requires(:protein_sequence_modification_attributes, type: Hash) do
        use :protein_sequence_modification_params
      end
      requires(:post_translational_modification_attributes, type: Hash) do
        use :post_translational_modification_params
      end

      optional :own_identifier, type: String, desc: 'Freetext field for a internal identifier'
      optional :ec_numbers, type: [String]
      # uniprot calls it fullName, but in our DB it's systematic_name
      optional :full_name, type: String, as: :systematic_name
      requires :short_name, type: String, allow_blank: false
      optional :molecular_weight, type: Float
      requires :sequence, type: String, allow_blank: false

      optional :link_pdb, type: String
      optional :pdb_doi, type: String
      optional :protein_source_details_comments, type: String
      optional :protein_source_details_expression_system, type: String
    end
  end

  params :sbmm_sample_params do
    optional :name, type: String
    optional :collection_id, type: Integer
    optional :external_label, type: String
    optional :function_or_application, type: String
    optional :concentration_value, type: Float
    optional :concentration_unit, type: String, values: %w[ng/L mg/L g/L], default: 'ng/L'
    optional :molarity_value, type: Float
    optional :molarity_unit, type: String, values: %w[mol/L mmol/L µmol/L nmol/L pmol/L], default: 'mol/L'
    optional :activity_per_volume_value, type: Float
    optional :activity_per_volume_unit, type: String, values: %w[U/L U/mL], default: 'U/L'
    optional :activity_per_mass_value, type: Float
    optional :activity_per_mass_unit, type: String, values: %w[U/g U/mg], default: 'U/g'
    optional :volume_as_used_value, type: Float
    optional :volume_as_used_unit, type: String, values: %w[L mL µL nL], default: 'L'
    optional :amount_as_used_mol_value, type: Float
    optional :amount_as_used_mol_unit, type: String, values: %w[mol mmol µmol nmol pmol], default: 'mol'
    optional :amount_as_used_mass_value, type: Float
    optional :amount_as_used_mass_unit, type: String, values: %w[g kg µg mg], default: 'g'
    optional :activity_value, type: Float
    optional :activity_unit, type: String, values: %w[U mU kat mkat µkat nkat], default: 'U'
    optional :container, type: Hash # TODO: Container Params als eigene Klasse definieren und überall wo benötigt einbinden
    optional :obtained_by, type: String, values: %w[purchased self_produced], allow_blank: true
    optional :supplier, type: String
    optional :formulation, type: String, values: %w[dissolved solid], allow_blank: true
    optional :purity, type: Float
    optional :purity_detection, type: String
    optional :purification_method, type: String

    requires(:sequence_based_macromolecule_attributes, type: Hash) do
      use :sbmm_params
    end

    given(sequence_based_macromolecule_attributes: ->(sbmm_attributes) { sbmm_attributes[:uniprot_derivation] != 'uniprot' }) do
      optional :heterologous_expression, type: String, values: %w[yes no unknown], default: 'unknown', allow_blank: true
      optional :organism, type: String
      optional :taxon_id, type: String
      optional :strain, type: String
      optional :tissue, type: String
      optional :localisation, type: String
    end
  end

  # Back to page one if the clicked page number > total page number
  def reset_pagination_page(scope)
    your_page = params[:page]
    per_page_recs = params[:per_page]
    total_recs = scope.size
    your_recs = your_page.to_i * per_page_recs.to_i
    total_page = (total_recs.to_f / per_page_recs.to_f).ceil

    your_page = 1 if total_recs.positive? && your_page > total_page

    params[:page] = your_page
  end
end

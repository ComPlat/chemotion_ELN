# frozen_string_literal: true

module Chemotion
  class SequenceBasedMacromoleculeSampleAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers ContainerHelpers
    helpers CollectionHelpers

    resource :sequence_based_macromolecule_samples do
      desc 'Get a list of SBMM-Samples, filtered by collection'
      params do
        optional :collection_id, type: Integer
        optional :sync_collection_id, type: Integer
        optional(:filter, type: Hash) do
          optional :timestamp_field, type: String, default: 'created_at', values: %w[created_at updated_at]
          optional :after_timestamp, type: Integer, desc: 'timestamp in ms'
          optional :before_timestamp, type: Integer, desc: 'timestamp in ms'
        end
      end
      paginate per_page: 7, offset: 0, max_per_page: 100
      get do
        sample_scope = Usecases::Sbmm::Samples.new(current_user: current_user).list(params)
        sbmm_samples = []
        reset_pagination_page(sample_scope) # prevent fetching pages without results

        paginate(sample_scope).each do |sbmm_sample|
          sbmm_samples << Entities::SequenceBasedMacromoleculeSampleEntity.represent(sbmm_sample)
        end

        { sequence_based_macromolecule_samples: sbmm_samples }
      end

      desc 'Fetch a SBMM sample by id'
      get ':id' do
        sample = SequenceBasedMacromoleculeSample.find(params[:id])
        error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, sample).read?

        present sample, with: Entities::SequenceBasedMacromoleculeSampleEntity, root: :sequence_based_macromolecule_sample
      end

      desc 'Create SBMM sample'
      params do
        optional :name, type: String
        optional :collection_id, type: Integer
        optional :external_label, type: String
        optional :function_or_application, type: String
        optional :concentration_value, type: Numeric
        optional :concentration_unit, type: String, values: %w[ng/L mg/L g/L], default: 'ng/L'
        optional :molarity_value, type: Numeric
        optional :molarity_unit, type: String, values: %w[mol/L mmol/L µmol/L nmol/L pmol/L], default: 'mol/L'
        optional :activity_per_volume_value, type: Numeric
        optional :activity_per_volume_unit, type: String, values: %w[U/L U/mL], default: 'U/L'
        optional :activity_per_mass_value, type: Numeric
        optional :activity_per_mass_unit, type: String, values: %w[U/g U/mg], default: 'U/g'
        optional :volume_as_used_value, type: Numeric
        optional :volume_as_used_unit, type: String, values: %w[L mL µL nL], default: 'L'
        optional :amount_as_used_mol_value, type: Numeric
        optional :amount_as_used_mol_unit, type: String, values: %w[mol mmol µmol nmol pmol], default: 'mol'
        optional :amount_as_used_mass_value, type: Numeric
        optional :amount_as_used_mass_unit, type: String, values: %w[g kg µg mg], default: 'g'
        optional :activity_value, type: Numeric
        optional :activity_unit, type: String, values: %w[U mU kat mkat µkat nkat], default: 'U'

        requires(:sequence_based_macromolecule_attributes, type: Hash) do
          requires :sbmm_type, type: String, desc: 'SBMM Type', values: %w[protein dna rna]
          requires :sbmm_subtype, type: String, desc: 'SBMM Subtype', values: %w[unmodified glycoprotein]
          requires :uniprot_derivation, type: String, desc: 'Existence in Uniprot', values: %w[uniprot uniprot_modified uniprot_unknown]
          
          given(uniprot_derivation: ->(derivation) { derivation == 'uniprot'} ) do
            requires :primary_accession, type: String, desc: 'Uniprot accession code'
          end
          given(uniprot_derivation: ->(derivation) { derivation == 'uniprot_modified'}) do
            requires :parent_identifier, type: String, desc: 'Uniprot accession or SBMM ID of parent record'

            requires(:protein_sequence_modification_attributes, type: Hash) do
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
            requires(:post_translational_modification_attributes, type: Hash) do
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
              optional :glycosylation_n_linked_lys_enabled, type: Boolean, default: false
              optional :glycosylation_n_linked_lys_details, type: String, default: ''
              optional :glycosylation_n_linked_ser_enabled, type: Boolean, default: false
              optional :glycosylation_n_linked_ser_details, type: String, default: ''
              optional :glycosylation_n_linked_thr_enabled, type: Boolean, default: false
              optional :glycosylation_n_linked_thr_details, type: String, default: ''
              optional :glycosylation_o_linked_asn_enabled, type: Boolean, default: false
              optional :glycosylation_o_linked_asn_details, type: String, default: ''
              optional :glycosylation_o_linked_lys_enabled, type: Boolean, default: false
              optional :glycosylation_o_linked_lys_details, type: String, default: ''
              optional :glycosylation_o_linked_ser_enabled, type: Boolean, default: false
              optional :glycosylation_o_linked_ser_details, type: String, default: ''
              optional :glycosylation_o_linked_thr_enabled, type: Boolean, default: false
              optional :glycosylation_o_linked_thr_details, type: String, default: ''

              optional :acetylation_enabled, type: Boolean, default: false
              given(:acetylation_enabled: ->(value) { value == true }) do
                requires :acetylation_lysin_number, type: Numeric
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
          end

          given(uniprot_derivation: ->(derivation) { derivation != 'uniprot' }) do
            optional :ec_numbers, type: Array[String]
            optional :systematic_name, type: String
            requires :molecular_weight, type: Numeric
            requires :sequence, type: String
            optional :heterologous_expression, type: String, values: %w[yes no unknown], default: 'unknown'
            optional :organism, type: String
            optional :taxon_id, type: String
            optional :tissue, type: String
            optional :localisation, type: String
            optional :protein_source_details_comments, type: String
            optional :protein_source_details_expression_system, type: String
          end
        end
      end
      post do
        sample = Usecases::Sbmm::Sample.new(current_user: current_user).create(declared(params, evaluate_given: true))

        present sample, with: Entities::SequenceBasedMacromoleculeSampleEntity, root: :sequence_based_macromolecule_sample
      end

      desc 'Delete a SBMM sample by id'
        params do
        requires :id, type: Integer, desc: 'Sample id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, SequenceBasedMacromoleculeSample.find(params[:id])).destroy?
        end

        delete do
          sample = SequenceBasedMacromoleculeSample.find(params[:id])
          sample.destroy
        end
      end

      namespace :ui_state do
        desc 'Get samples by UI state'
        params do
          requires :ui_state, type: Hash, desc: 'Selected SBMM samples from the UI' do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
            optional :from_date, type: Date
            optional :to_date, type: Date
            optional :collection_id, type: Integer
            optional :is_sync_to_me, type: Boolean, default: false
          end
          optional :limit, type: Integer, desc: 'Limit number of SBMM samples'
        end

        before do
          cid = fetch_collection_id_w_current_user(params[:ui_state][:collection_id], params[:ui_state][:is_sync_to_me])
          @sbmm_samples = SequenceBasedMacromoleculeSample.by_collection_id(cid).by_ui_state(params[:ui_state]).for_user(current_user.id)
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, @sbmm_samples).read?
        end

        # we are using POST because the fetchers don't support GET requests with body data
        post do
          @sbmm_samples = @sbmm_samples.limit(params[:limit]) if params[:limit]

          present @sbmm_samples, with: Entities::SequenceBasedMacromoleculeSampleEntity, root: :sequence_based_macromolecule_samples
        end
      end
    end
  end
end

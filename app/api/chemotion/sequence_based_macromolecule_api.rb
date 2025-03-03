# frozen_string_literal: true

module Chemotion
  class SequenceBasedMacromoleculeAPI < Grape::API
    resource :sequence_based_macromolecules do
      desc 'Search for sequence based macromolecules'
      params do
        requires :search_field, type: String, desc: 'Field to search in', default: 'accession'
        requires :search_term, type: String, desc: 'Text to search for'
      end
      get do
        search_params = { search_term: params[:search_term], search_field: params[:search_field] }
        finder = Usecases::Sbmm::Finder.new
        search_results = finder.search_in_eln(**search_params).to_a
        search_results += finder.search_in_uniprot(**search_params)

        present search_results, with: Entities::SequenceBasedMacromoleculeSearchResultEntity, root: :search_results
      end

      desc 'Get Uniprot entry by ID'
      params do
        requires :type, type: String, values: %w[eln uniprot]
      end
      get ':identifier' do
        fetcher = Services::Sbmm::Finder.new

        if type == 'eln'
          sbmm = fetcher.find_in_eln(id: params[:identifier])
        elsif type == 'uniprot'
          sbmm = fetcher.find_in_uniprot(primary_accession: params[:identifier])
        end

        present sbmm, with: Entities::SequenceBasedMacromoleculeEntity, root: :sequence_based_macromolecule
      end

      desc 'Create SBMM'
      params do
        requires :sbmm_type, type: String, desc: 'SBMM Type', values: %w[protein dna rna]
        requires :sbmm_subtype, type: String, desc: 'SBMM Subtype', values: %w[unmodified glycoprotein]
        requires :uniprot_derivation, type: String, desc: 'Existence in Uniprot', values: %w[uniprot uniprot_modified uniprot_unknown]

        given(uniprot_derivation: ->(derivation) { derivation == 'uniprot'} ) do
          requires :identifier, type: String, desc: 'Uniprot accession code'
        end
        given(uniprot_derivation: ->(derivation) { derivation == 'uniprot_modified'}) do
          requires :parent_identifier, type: String, desc: 'Uniprot accession or SBMM ID of parent record'
        end
        # TODO: does uniprot_unknown require an individual identifier or does it not allow parent records?

        given(uniprot_derivation: ->(derivation) { derivation != 'uniprot' }) do
          requires :protein_sequence_modifications, type: Boolean
          given(protein_sequence_modifications: ->(psm) { psm == true }) do
            requires(:protein_sequence_modifications_attributes, type: Hash) do
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
          end

          requires :post_translational_modifications, type: Boolean
          given(post_translational_modifications: ->(ptm) { ptm == true }) do
            requires(:post_translational_modifications_attributes, type: Hash) do
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
              optional :acetylation_lysin_number, type: Numeric

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
        optional(:sample_attributes, type: Hash) do
          optional :name, type: String
          optional :external_label, type: String
          optional :function_or_application, type: String
          optional :concentration, type: Numeric
          optional :molarity, type: Numeric
          optional :volume_as_used, type: Numeric
        end
      end
      post do
        # TODO: what do we do with errors here? how are error messages from the server returned to the UI?
        sbmm = Usecases::Sbmm::Create.new.find_or_create_by(params)

        present sbmm, with: Entities::SequenceBasedMacromoleculeEntity, root: :sequence_based_macromolecule
      end
    end
  end
end

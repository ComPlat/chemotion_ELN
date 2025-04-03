# frozen_string_literal: true

module Chemotion
  class SequenceBasedMacromoleculeAPI < Grape::API
    resource :sequence_based_macromolecules do
      desc 'Search for sequence based macromolecules'
      params do
        requires :search_field, type: String, desc: 'Field to search in', values: %w[accession ec protein_name], default: 'accession'
        requires :search_term, type: String, desc: 'Text to search for'
      end
      get do
        search_params = { search_term: params[:search_term], search_field: params[:search_field] }
        finder = Usecases::Sbmm::Finder.new
        search_results = finder.search_in_eln(**search_params).to_a
        search_results += finder.search_in_uniprot(**search_params)

        present search_results, with: Entities::SequenceBasedMacromoleculeSearchResultEntity, root: :search_results
      end

      desc 'Get SBMM entry by ID (if ELN) or accession (if Uniprot)'
      params do
        requires :type, type: String, values: %w[eln uniprot]
      end
      get ':identifier' do
        fetcher = Usecases::Sbmm::Finder.new

        if params[:type] == 'eln'
          sbmm = fetcher.find_in_eln(id: params[:identifier])
        elsif params[:type] == 'uniprot'
          sbmm = fetcher.find_in_uniprot(primary_accession: params[:identifier])
        end

        present sbmm, with: Entities::SequenceBasedMacromoleculeEntity, root: :sequence_based_macromolecule
      end
    end
  end
end

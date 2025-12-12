# frozen_string_literal: true

# Load the OpenSearch service
require Rails.root.join('app', 'services', 'analyses', 'opensearch_service')

module Chemotion
  class OpenSearchAPI < Grape::API
    helpers do
      def opensearch_available?
        url = Analyses::OpenSearchService.opensearch_url
        url.present? && !url.empty?
      rescue StandardError => e
        Rails.logger.warn("OpenSearch availability check failed: #{e.message}")
        false
      end

      def build_filters_from_params
        {
          techniques: params[:technique].present? ? [params[:technique]] : params[:techniques],
          nmr_nucleus: params[:nucleus].present? ? [params[:nucleus]] : params[:nmr_nucleus],
          nmr_solvent: params[:nmr_solvent],
          frequency_min: params[:frequency_min],
          frequency_max: params[:frequency_max],
          shift_min: params[:shift_min],
          shift_max: params[:shift_max],
          sample_id: params[:sample_id]
        }.compact
      end
    end

    resource :opensearch do
      desc 'Search analyses in OpenSearch'
      params do
        optional :q, type: String, desc: 'Search query text'
        optional :query, type: String, desc: 'Search query text (alias for q)'
        optional :page, type: Integer, default: 1, desc: 'Page number'
        optional :size, type: Integer, default: 20, desc: 'Results per page'
        optional :per_page, type: Integer, desc: 'Results per page (alias for size)'
        optional :technique, type: String, desc: 'Filter by single technique'
        optional :techniques, type: Array[String], desc: 'Filter by techniques (NMR, IR, MS, etc.)'
        optional :nucleus, type: String, desc: 'Filter by single NMR nucleus'
        optional :nmr_nucleus, type: Array[String], desc: 'Filter by NMR nucleus (1H, 13C, etc.)'
        optional :nmr_solvent, type: String, desc: 'Filter by solvent'
        optional :frequency_min, type: Float, desc: 'Minimum frequency in MHz'
        optional :frequency_max, type: Float, desc: 'Maximum frequency in MHz'
        optional :shift_min, type: Float, desc: 'Minimum chemical shift'
        optional :shift_max, type: Float, desc: 'Maximum chemical shift'
        optional :sample_id, type: Integer, desc: 'Filter by sample ID'
        optional :search_after, type: Array, desc: 'Search after cursor for pagination'
      end
      get :search do
        search_query = params[:q] || params[:query]
        page_size = params[:size] || params[:per_page] || 20

        result = Analyses::OpenSearchService.search(
          query: search_query,
          filters: build_filters_from_params,
          page: params[:page],
          per_page: page_size,
          search_after: params[:search_after]
        )

        if result[:error]
          status_code = result[:status].is_a?(Integer) ? result[:status] : 500
          error!({ error: result[:error] }, status_code)
        else
          result
        end
      end

      desc 'Get autocomplete suggestions'
      params do
        optional :q, type: String, desc: 'Search query prefix'
        optional :query, type: String, desc: 'Search query prefix (alias)'
        optional :technique, type: String, desc: 'Filter by technique'
        optional :nucleus, type: String, desc: 'Filter by nucleus'
        optional :limit, type: Integer, default: 10, desc: 'Number of suggestions'
      end
      get :autocomplete do
        search_query = params[:q] || params[:query]

        if search_query.blank?
          return { suggestions: [] }
        end

        suggestions = Analyses::OpenSearchService.suggest(
          query: search_query,
          limit: params[:limit]
        )

        { suggestions: suggestions }
      end

      desc 'Get aggregations for filter options'
      get :aggregations do
        Analyses::OpenSearchService.get_aggregations
      end
    end
  end
end

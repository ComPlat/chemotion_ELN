# frozen_string_literal: true

module Analyses
  # Service for querying OpenSearch analysis data
  class OpenSearchService
    class << self
      def opensearch_url
        ENV.fetch('OPENSEARCH_URL', 'http://opensearch:9200')
      end

      def index_name
        ENV.fetch('OPENSEARCH_INDEX', 'chemotion-cdc-transformed')
      end

      # Search analyses with full-text and filters
      def search(query:, filters: {}, page: 1, per_page: 20, search_after: nil)
        body = build_search_query(query, filters, page, per_page, search_after)

        response = HTTParty.post(
          "#{opensearch_url}/#{index_name}/_search",
          headers: { 'Content-Type' => 'application/json' },
          body: body.to_json,
          timeout: 30
        )

        if response.success?
          parse_search_response(response.parsed_response)
        else
          Rails.logger.error("OpenSearch search failed: #{response.code} - #{response.body}")
          { error: 'Search failed', status: response.code }
        end
      rescue StandardError => e
        Rails.logger.error("OpenSearch search error: #{e.message}")
        { error: e.message }
      end

      # Get aggregations for filter counts
      # Note: This requires keyword fields in the index mapping
      # If fields are mapped as text, use .keyword suffix or update mapping
      def get_aggregations
        # Return empty for now - aggregations require keyword field mappings
        # TODO: Update OpenSearch index mapping to add keyword fields for techniques, nmr_nucleus, nmr_solvent
        {
          techniques: [],
          nmr_nucleus: [],
          nmr_solvent: []
        }
      end

      # Get autocomplete suggestions
      def suggest(query:, limit: 10)
        return [] if query.blank?

        # Normalize query for flexible matching
        normalized_query = query.gsub(/[-_]/, ' ').squeeze(' ').strip

        # Use prefix query for autocomplete on search_text field
        body = {
          size: limit,
          _source: %w[search_text container_name techniques nmr_nucleus],
          query: {
            bool: {
              should: [
                { match_phrase_prefix: { search_text: { query: normalized_query, max_expansions: 50 } } },
                { wildcard: { search_text: "*#{normalized_query.downcase}*" } }
              ]
            }
          }
        }

        response = HTTParty.post(
          "#{opensearch_url}/#{index_name}/_search",
          headers: { 'Content-Type' => 'application/json' },
          body: body.to_json,
          timeout: 10
        )

        if response.success?
          parse_suggestion_response(response.parsed_response)
        else
          Rails.logger.error("OpenSearch suggest failed: #{response.code} - #{response.body}")
          []
        end
      rescue StandardError => e
        Rails.logger.error("OpenSearch suggest error: #{e.message}")
        []
      end

      private

      # Normalize query to handle hyphens, underscores, and spaces interchangeably
      def normalize_query(query)
        return query unless query.present?

        # Replace hyphens and underscores with spaces for more flexible matching
        normalized = query.gsub(/[-_]/, ' ').squeeze(' ').strip
        normalized
      end

      def build_search_query(query, filters, page, per_page, search_after)
        must_clauses = []
        filter_clauses = []

        # Full-text search with normalized query
        if query.present?
          normalized = normalize_query(query)
          must_clauses << {
            multi_match: {
              query: normalized,
              fields: ['search_text^2', 'container_name', 'sample_name'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          }
        end

        # Technique filter - use match query for text fields
        if filters[:techniques].present?
          techniques = Array(filters[:techniques])
          techniques.each do |technique|
            must_clauses << { match: { techniques: technique } }
          end
        end

        # NMR nucleus filter - use match query for text fields
        if filters[:nmr_nucleus].present?
          nuclei = Array(filters[:nmr_nucleus])
          nuclei.each do |nucleus|
            must_clauses << { match: { nmr_nucleus: nucleus } }
          end
        end

        # Solvent filter - use match query for text fields
        if filters[:nmr_solvent].present?
          must_clauses << { match: { nmr_solvent: filters[:nmr_solvent] } }
        end

        # Frequency range filter
        if filters[:frequency_min].present? || filters[:frequency_max].present?
          range = {}
          range[:gte] = filters[:frequency_min].to_f if filters[:frequency_min].present?
          range[:lte] = filters[:frequency_max].to_f if filters[:frequency_max].present?
          filter_clauses << { range: { nmr_frequency_mhz: range } }
        end

        # Chemical shift range filter
        if filters[:shift_min].present? || filters[:shift_max].present?
          range = {}
          range[:gte] = filters[:shift_min].to_f if filters[:shift_min].present?
          range[:lte] = filters[:shift_max].to_f if filters[:shift_max].present?
          filter_clauses << { range: { 'nmr_data.peaks.chemical_shift': range } }
        end

        # Sample ID filter
        if filters[:sample_id].present?
          filter_clauses << { term: { sample_id: filters[:sample_id].to_i } }
        end

        # Build query
        bool_query = {}
        bool_query[:must] = must_clauses if must_clauses.any?
        bool_query[:filter] = filter_clauses if filter_clauses.any?

        # If no query or filters, match all
        if bool_query.empty?
          bool_query[:must] = [{ match_all: {} }]
        end

        body = {
          query: { bool: bool_query },
          from: (page - 1) * per_page,
          size: per_page,
          sort: [
            { _score: 'desc' },
            { container_id: 'asc' }
          ],
          highlight: {
            pre_tags: ['<mark>'],
            post_tags: ['</mark>'],
            fields: {
              search_text: { fragment_size: 200, number_of_fragments: 3 },
              container_name: {},
              sample_name: {}
            }
          }
          # Note: Aggregations disabled - techniques/nmr_nucleus fields need keyword mapping
          # aggs: {
          #   techniques: { terms: { field: 'techniques.keyword', size: 20 } },
          #   nmr_nucleus: { terms: { field: 'nmr_nucleus.keyword', size: 10 } }
          # }
        }

        # Use search_after for pagination (more efficient for deep pagination)
        if search_after.present?
          body[:search_after] = search_after
          body.delete(:from)
        end

        body
      end

      def parse_search_response(response)
        hits = response.dig('hits', 'hits') || []
        total = response.dig('hits', 'total', 'value') || 0

        {
          total: total,
          hits: hits.map do |hit|
            {
              id: hit['_id'],
              score: hit['_score'],
              source: hit['_source'],
              highlight: hit['highlight'],
              sort: hit['sort']
            }
          end,
          aggregations: { techniques: [], nmr_nucleus: [], nmr_solvent: [] },
          search_after: hits.last&.dig('sort')
        }
      end

      def parse_aggregations_response(response)
        aggs = response['aggregations'] || {}

        {
          techniques: parse_buckets(aggs.dig('techniques', 'buckets')),
          nmr_nucleus: parse_buckets(aggs.dig('nmr_nucleus', 'buckets')),
          nmr_solvent: parse_buckets(aggs.dig('nmr_solvent', 'buckets'))
        }
      end

      def parse_buckets(buckets)
        return [] unless buckets

        buckets.map { |b| { key: b['key'], count: b['doc_count'] } }
      end

      def parse_suggestion_response(response)
        hits = response.dig('hits', 'hits') || []

        hits.map do |hit|
          text = hit.dig('_source', 'search_text')
          # Truncate and clean the text
          clean_text = text&.gsub(/\s+/, ' ')&.strip&.truncate(120)
          {
            text: clean_text,
            container_name: hit.dig('_source', 'container_name'),
            technique: hit.dig('_source', 'techniques')&.first,
            nucleus: hit.dig('_source', 'nmr_nucleus')
          }
        end
      end
    end
  end
end

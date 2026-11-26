# frozen_string_literal: true

module Usecases
  module Search
    class AllElementsSearch
      # @param scope [CollectionScope] the collections the search runs over
      def initialize(term:, scope:, user:)
        @term = term
        @scope = scope
        @user = user
        @pg_elements =
          %w[sample reaction screen wellplate sequence_based_macromolecule_sample device_description cell_line]
      end

      def search_by_substring
        return Results.new(PgSearch::Document.none, scope: @scope) if @scope.empty?

        Results.new(PgSearch.multisearch(@term), scope: @scope)
               .in_scope(@user, @pg_elements)
      end

      class Results
        attr_reader :results

        # @param scope [CollectionScope] the collections the search runs over
        def initialize(results, scope:)
          raise ArgumentError, 'scope must be present' if scope.nil?

          @results = results
          @scope = scope
        end

        def first
          Results.new(@results.first, scope: @scope)
        end

        delegate :empty?, to: :@results

        # Keeps the documents of records held in a collection of the scope.
        def in_scope(user, pg_elements)
          types = (prof = user&.profile&.data) ? prof.fetch('layout', {}).keys & pg_elements : pg_elements
          types.push('element')

          query = types.map do |type|
            "(#{searchable_type_for_query(type)} AND searchable_id IN (" \
              "SELECT #{type_id(type)} FROM #{collections_by_type(type)} " \
              'WHERE collection_id IN (:collection_ids) AND deleted_at IS NULL))'
          end
          query.concat(material_collection_queries(types))

          @results = @results.where(query.join(' OR '), collection_ids: @scope.ids)
          Results.new(@results, scope: @scope)
        end

        def searchable_type_for_query(type)
          searchable_type = type == 'cell_line' ? 'CelllineSample' : type.camelize
          "searchable_type = '#{searchable_type}'"
        end

        def type_id(type)
          if type == 'cell_line'
            'cellline_sample_id'
          else
            "#{type}_id"
          end
        end

        def collections_by_type(type)
          if type == 'cell_line'
            'collections_celllines'
          else
            "collections_#{type.pluralize}"
          end
        end

        # def molecules_ids
        #   filter_results_ids_by_type('Molecule')
        # end

        def samples_ids
          filter_results_ids_by_type('Sample')
        end

        def reactions_ids
          filter_results_ids_by_type('Reaction')
        end

        def wellplates_ids
          filter_results_ids_by_type('Wellplate')
        end

        def screens_ids
          filter_results_ids_by_type('Screen')
        end

        def sequence_based_macromolecule_sample_ids
          sbmm_sample_ids = filter_results_ids_by_type('SequenceBasedMacromoleculeSample')
          sbmm_ids = filter_results_ids_by_type('SequenceBasedMacromolecule')
          sbmm_sample_ids_by_sbmm = []

          if sbmm_ids.present?
            sbmm_sample_ids_by_sbmm =
              @scope.relation_for(SequenceBasedMacromoleculeSample)
                    .where(sequence_based_macromolecule_id: sbmm_ids, deleted_at: nil)
                    .pluck(:id)
          end
          (sbmm_sample_ids + sbmm_sample_ids_by_sbmm).uniq
        end

        def device_description_ids
          filter_results_ids_by_type('DeviceDescription')
        end

        def cell_line_ids
          cell_line_sample_ids = filter_results_ids_by_type('CelllineSample')
          cell_line_material_ids = filter_results_ids_by_type('CelllineMaterial')
          sample_ids_by_material = []

          if cell_line_material_ids.present?
            sample_ids_by_material = @scope.relation_for(CelllineSample)
                                           .where(cellline_material_id: cell_line_material_ids).pluck(:id)
          end
          (cell_line_sample_ids + sample_ids_by_material).uniq
        end

        def element_ids
          filter_results_ids_by_type('Element')
        end

        private

        def material_collection_queries(types)
          queries = []
          if types.include?('sequence_based_macromolecule_sample')
            ids = @scope.relation_for(SequenceBasedMacromoleculeSample)
                        .select(:sequence_based_macromolecule_id)
            queries << "(searchable_type = 'SequenceBasedMacromolecule' AND searchable_id IN (#{ids.to_sql}))"
          end
          if types.include?('cell_line')
            ids = @scope.relation_for(CelllineSample).select(:cellline_material_id)
            queries << "(searchable_type = 'CelllineMaterial' AND searchable_id IN (#{ids.to_sql}))"
          end
          queries
        end

        def filter_results_by_type(type)
          @results.where(searchable_type: type).includes(:searchable)
        end

        def filter_results_ids_by_type(type)
          @results.where(searchable_type: type).pluck(:searchable_id)
        end
      end
    end
  end
end

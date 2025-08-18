# frozen_string_literal: true

module Usecases
  module Search
    class AllElementsSearch
      def initialize(term:, collection_id:, user:)
        @term = term
        @collection_id = collection_id
        @user = user
        @pg_elements = %w[sample reaction screen wellplate sequence_based_macromolecule_sample]
      end

      def search_by_substring
        Results.new(PgSearch.multisearch(@term)).by_collection_id(@collection_id, @user, @pg_elements)
      end

      class Results
        attr_reader :results

        def initialize(results)
          @results = results
        end

        def first
          Results.new(@results.first)
        end

        delegate :empty?, to: :@results

        def by_collection_id(collection_id, user, pg_elements)
          types = (prof = user&.profile&.data) ? prof.fetch('layout', {}).keys & pg_elements : pg_elements
          types.push('element')

          query = types.map do |type|
            "(#{searchable_type_for_query(type)} AND searchable_id IN (" \
              "SELECT #{type}_id FROM collections_#{type.pluralize} " \
              "WHERE collection_id = #{collection_id} AND deleted_at IS NULL))"
          end

          @results = @results.where(query.join(' OR '))
          Results.new(@results)
        end

        def searchable_type_for_query(type)
          if type == 'sequence_based_macromolecule_sample'
            "(searchable_type = '#{type.camelize}' OR searchable_type = 'SequenceBasedMacromolecule')"
          else
            "searchable_type = '#{type.camelize}'"
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

          if sbmm_ids
            sbmm_sample_ids_by_sbmm =
              SequenceBasedMacromoleculeSample.where(sequence_based_macromolecule_id: sbmm_ids, deleted_at: nil)
                                              .pluck(:id)
          end
          (sbmm_sample_ids + sbmm_sample_ids_by_sbmm).uniq
        end

        def element_ids
          filter_results_ids_by_type('Element')
        end

        private

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

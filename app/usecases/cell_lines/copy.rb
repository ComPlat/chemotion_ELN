# frozen_string_literal: true

module Usecases
  module CellLines
    class Copy
      def initialize(cell_line_sample_to_copy, current_user, collection_id)
        @current_user = current_user
        @cell_line_sample_to_copy = cell_line_sample_to_copy
        @collection_id = collection_id
      end

      def execute!
        copied_cell_line_sample = copy_cellline_sample
        create_collection_links(copied_cell_line_sample.id)
        @current_user.increment_counter('celllines') # rubocop: disable Rails/SkipsModelValidations
        copied_cell_line_sample
      end

      private

      def copy_cellline_sample
        CelllineSample.create(
          cellline_material: @cell_line_sample_to_copy.cellline_material,
          creator: @current_user,
          amount: @cell_line_sample_to_copy[:amount],
          unit: @cell_line_sample_to_copy[:unit],
          passage: @cell_line_sample_to_copy[:passage],
          contamination: @cell_line_sample_to_copy[:contamination],
          name: @cell_line_sample_to_copy[:name],
          description: @cell_line_sample_to_copy[:description],
          short_label: create_short_label,
        )
      end

      def create_short_label
        "#{@current_user.name_abbreviation}-C#{@current_user.counters['celllines']}"
      end

      def create_collection_links(id)
        CollectionsCellline.create(
          collection: Collection.find(@collection_id),
          cellline_sample_id: id,
        )
        CollectionsCellline.create(
          collection: all_collection_of_current_user,
          cellline_sample_id: id,
        )
      end

      def all_collection_of_current_user
        Collection.get_all_collection_for_user(@current_user.id)
      end
    end
  end
end

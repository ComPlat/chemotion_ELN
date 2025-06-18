# frozen_string_literal: true

module Usecases
  module Wellplates
    class WellplateUpdater
      attr_reader :wellplate, :current_user

      def initialize(wellplate:, current_user:)
        @wellplate = wellplate
        @current_user = current_user
      end

      # well data must contain complete data for ALL wells of a wellplate
      # otherwise all samples that are in the wellplate but not in well_data are deleted!
      #
      # rubocop:disable Metrics/AbcSize, Metrics/MethodLength, Metrics/PerceivedComplexity, Metrics/CyclomaticComplexity
      def update_wells(well_data:)
        collections = wellplate.collections
        current_sample_ids = wellplate.wells.pluck(:sample_id).uniq.compact
        included_sample_ids = []

        well_data.each do |well|
          sample = well[:sample]
          sample_id = sample && sample[:id]

          if sample
            if sample[:is_new] && sample[:parent_id]
              parent_sample = Sample.find(sample[:parent_id])
              subsample = parent_sample.create_subsample(current_user, collections.pluck(:id))
              sample_id = subsample.id
            end
            included_sample_ids << sample_id
          end

          well_attributes = {
            sample_id: sample_id,
            readouts: well[:readouts],
            additive: well[:additive],
            position_x: well[:position][:x],
            position_y: well[:position][:y],
            label: well[:label],
            color_code: well[:color_code],
          }.compact
          well_attributes[:color_code] = nil if well[:color_code].blank?
          if well[:is_new]
            wellplate.wells.create(well_attributes)
          else
            Well.find(well[:id]).update(well_attributes)
          end
        end

        deleted_sample_ids = current_sample_ids - included_sample_ids
        Sample.where(id: deleted_sample_ids).destroy_all
      end
      # rubocop:enable Metrics/AbcSize, Metrics/MethodLength, Metrics/PerceivedComplexity, Metrics/CyclomaticComplexity
    end
  end
end

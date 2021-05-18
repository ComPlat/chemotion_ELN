# frozen_string_literal: true

module Usecases::Wellplates::WellplateUpdater
  def self.update_wells_for_wellplate(wellplate, wells)
    collections = wellplate.collections
    current_sample_ids = wellplate.wells.pluck(:sample_id).uniq.compact
    included_sample_ids = []

    wells.each do |well|
      sample = well[:sample]
      sample_id = sample && sample[:id]

      if sample
        if sample[:is_new] && sample[:parent_id]
          parent_sample = Sample.find(sample[:parent_id])

          subsample = parent_sample.dup
          subsample.parent = parent_sample
          subsample.short_label = nil # we don't want to inherit short_label from parent
          subsample.name = sample[:name]

          # assign subsample to all collections
          subsample.collections << collections
          subsample.save!
          subsample.reload

          sample_id = subsample.id
        end
        included_sample_ids << sample_id
      end

      if well[:is_new]
        Well.create(
          wellplate_id: wellplate.id,
          sample_id: sample_id,
          readouts: well[:readouts],
          additive: well[:additive],
          position_x: well[:position][:x],
          position_y: well[:position][:y]
        )
      else
        Well.find(well[:id]).update(
          sample_id: sample_id,
          readouts: well[:readouts],
          additive: well[:additive],
          position_x: well[:position][:x],
          position_y: well[:position][:y]
        )
      end
    end

    deleted_sample_ids = current_sample_ids - included_sample_ids
    Sample.where(id: deleted_sample_ids).destroy_all
  end
end

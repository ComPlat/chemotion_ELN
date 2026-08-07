# frozen_string_literal: true

class AddMetadataToMeasurements < ActiveRecord::Migration[6.1]
  def change
    add_column :measurements, :metadata, :jsonb, default: {}
  end
end

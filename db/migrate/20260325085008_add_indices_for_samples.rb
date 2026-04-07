# frozen_string_literal: true

class AddIndicesForSamples < ActiveRecord::Migration[6.1]
  def change
    add_index :samples, :short_label, name: "index_samples_on_short_label"
    add_index :reactions_samples, [:sample_id, :type], name: 'index_reactions_samples_on_sample_id_type'
  end
end

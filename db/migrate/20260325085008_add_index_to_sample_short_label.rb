# frozen_string_literal: true

class AddIndexToSampleShortLabel < ActiveRecord::Migration[6.1]
  def change
    add_index :samples, :short_label, name: "index_samples_short_label"
  end
end

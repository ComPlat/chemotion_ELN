# frozen_string_literal: true

class AddIsLegacyToSamples < ActiveRecord::Migration[6.1]
  def up
    add_column :samples, :is_legacy, :boolean, default: false, null: false
    add_index :samples, :is_legacy, name: 'index_samples_on_is_legacy', where: 'is_legacy = TRUE'
  end

  def down
    remove_index :samples, name: 'index_samples_on_is_legacy'
    remove_column :samples, :is_legacy
  end
end

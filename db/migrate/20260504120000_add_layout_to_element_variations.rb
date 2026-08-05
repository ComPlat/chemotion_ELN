# frozen_string_literal: true

class AddLayoutToElementVariations < ActiveRecord::Migration[6.1]
  def self.up
    return unless table_exists?(:element_variations)
    return if column_exists?(:element_variations, :layout)

    add_column :element_variations, :layout, :jsonb, null: false, default: {}
  end

  def self.down
    return unless column_exists?(:element_variations, :layout)

    remove_column :element_variations, :layout
  end
end

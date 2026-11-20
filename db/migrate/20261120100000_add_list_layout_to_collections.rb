# frozen_string_literal: true

class AddListLayoutToCollections < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :list_layout, :jsonb, default: {}
  end
end

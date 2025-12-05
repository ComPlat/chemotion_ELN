# frozen_string_literal: true

class AddElementSearchIndexes < ActiveRecord::Migration[6.1]
  def change
    # Add trigram GIN index on name column for efficient substring searches
    add_index :elements, :name, using: :gin, opclass: :gin_trgm_ops, name: 'index_elements_on_name_trigram'

    # Add trigram GIN index on short_label column for efficient substring searches
    add_index :elements, :short_label, using: :gin, opclass: :gin_trgm_ops, name: 'index_elements_on_short_label_trigram'
  end
end

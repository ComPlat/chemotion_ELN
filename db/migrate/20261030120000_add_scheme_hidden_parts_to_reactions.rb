# frozen_string_literal: true

class AddSchemeHiddenPartsToReactions < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :scheme_hidden_parts, :string, array: true, null: false, default: []
  end
end

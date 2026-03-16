# frozen_string_literal: true

class AddReactionTypeToReactions < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :reaction_type, :string, default: 'standard', null: false
  end
end

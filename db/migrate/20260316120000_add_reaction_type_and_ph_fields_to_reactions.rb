# frozen_string_literal: true

class AddReactionTypeAndPhFieldsToReactions < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :reaction_type, :string, default: 'standard', null: false
    add_column :reactions, :ph_operator, :string, default: '=', null: false
    add_column :reactions, :ph_value, :float
  end
end

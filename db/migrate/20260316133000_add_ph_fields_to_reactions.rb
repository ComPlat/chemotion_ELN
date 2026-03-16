# frozen_string_literal: true

class AddPhFieldsToReactions < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :ph_operator, :string, default: '=', null: false
    add_column :reactions, :ph_value, :string
  end
end

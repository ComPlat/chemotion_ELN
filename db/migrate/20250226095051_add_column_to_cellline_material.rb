# frozen_string_literal: true

class AddColumnToCelllineMaterial < ActiveRecord::Migration[6.1]
  def change
    add_index :cellline_materials, %i[name source], unique: true
    add_column :cellline_materials, :created_by, :integer, null: true
  end
end

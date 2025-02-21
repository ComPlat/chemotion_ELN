# frozen_string_literal: true

class CellLinesConstraint < ActiveRecord::Migration[6.1]
  def change
    add_index :cellline_materials, %i[name source], unique: true
  end
end

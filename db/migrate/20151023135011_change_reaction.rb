class ChangeReaction < ActiveRecord::Migration
  def change
    add_column :reactions, :solvent, :string
    rename_column :reactions, :solvents, :tlc_solvents
  end
end

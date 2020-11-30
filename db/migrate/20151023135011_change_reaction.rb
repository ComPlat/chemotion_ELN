class ChangeReaction < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions, :solvent, :string
    rename_column :reactions, :solvents, :tlc_solvents
  end
end

class AddMeltingAndBoilingPointToMolecules < ActiveRecord::Migration
  def change
    add_column :molecules, :boiling_point, :float
    add_column :molecules, :melting_point, :float
  end
end

class AddCasToMoleculesSamples < ActiveRecord::Migration
  def change
    add_column :molecules, :cas, :text
    add_column :samples, :xref, :jsonb, default: '{}'
  end
end

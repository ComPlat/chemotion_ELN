class AddCasToMoleculesSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :molecules, :cas, :text
    add_column :samples, :xref, :jsonb, default: '{}'
  end
end

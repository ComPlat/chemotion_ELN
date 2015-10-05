class AddExternalLabelToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :external_label, :string, default: ""
  end
end

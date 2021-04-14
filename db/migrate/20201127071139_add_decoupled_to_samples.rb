class AddDecoupledToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :decoupled, :boolean, default: false, null: false
  end
end

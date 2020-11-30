class AddDecoupledToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :decoupled, :boolean, default: false, null: false
  end
end

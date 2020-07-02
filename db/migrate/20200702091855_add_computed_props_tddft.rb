class AddComputedPropsTddft < ActiveRecord::Migration
  def change
    add_column :computed_props, :tddft, :jsonb, default: '{}'
  end
end

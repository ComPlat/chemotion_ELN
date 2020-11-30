class AddComputedPropsTddft < ActiveRecord::Migration[4.2]
  def change
    add_column :computed_props, :tddft, :jsonb, default: '{}'
  end
end

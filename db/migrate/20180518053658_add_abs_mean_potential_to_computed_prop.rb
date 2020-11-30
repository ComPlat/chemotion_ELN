class AddAbsMeanPotentialToComputedProp < ActiveRecord::Migration[4.2]
  def change
    add_column :computed_props, :mean_abs_potential, :float, default: 0.0
  end
end

class FixJsonDefault < ActiveRecord::Migration[5.2]
  def change
    Matrice.where(configs: '{}').find_each { |p| p.update_columns(configs: {}) }
    ComputedProp.where(tddft: '{}').find_each { |p| p.update_columns(tddft: {}) }
  end
end

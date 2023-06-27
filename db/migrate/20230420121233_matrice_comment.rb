class MatriceComment < ActiveRecord::Migration[6.1]
  def change
    Matrice.create(
      name: 'commentActivation',
      enabled: false,
      label: 'commentActivation',
      include_ids: [],
      exclude_ids: [],
      configs: {}
    )
  end
end

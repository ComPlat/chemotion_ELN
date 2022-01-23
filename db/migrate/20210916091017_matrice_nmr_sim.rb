class MatriceNmrSim < ActiveRecord::Migration[5.2]
  def change
    Matrice.create(
      name: 'nmrSim',
      enabled: false,
      label: 'nmrSim',
      include_ids: [],
      exclude_ids: []
    )
  end
end

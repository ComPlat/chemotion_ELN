# Add Ketcher2 to Matrice
class MatriceKetcher2Editor < ActiveRecord::Migration[5.2]
  def change
    Matrice.create(
      name: 'ketcher2Editor',
      enabled: false,
      label: 'ketcher2Editor',
      include_ids: [],
      exclude_ids: []
    )
  end
end

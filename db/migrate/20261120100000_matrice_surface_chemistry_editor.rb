class MatriceSurfaceChemistryEditor < ActiveRecord::Migration[6.1]
  def change
    return if Matrice.find_by(name: 'surfaceChemistryEditor')

    Matrice.create(
      name: 'surfaceChemistryEditor', enabled: false, label: 'surfaceChemistryEditor',
      include_ids: [], exclude_ids: [], configs: { editor: 'surfaceChemistry' }
    )
  end
end

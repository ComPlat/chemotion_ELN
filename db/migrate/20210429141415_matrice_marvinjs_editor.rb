class MatriceMarvinjsEditor < ActiveRecord::Migration[4.2]
  def change
    Matrice.create(name: 'marvinjsEditor', enabled: false, label: 'marvinjsEditor', include_ids: [], exclude_ids: [], configs: { editor: 'marvinjs' } ) if Matrice.find_by(name: 'marvinjsEditor').nil?
  end
end

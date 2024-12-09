class MatriceMoleculeViewer < ActiveRecord::Migration[6.1]
  def up
    Matrice.create(
      name: 'moleculeViewer',
      enabled: true,
      label: 'moleculeViewer',
      include_ids: [],
      exclude_ids: []
    ) unless Matrice.find_by(name: 'moleculeViewer')
  end

  def down
    Matrice.find_by(name: 'moleculeViewer')&.really_destroy!
  end
end

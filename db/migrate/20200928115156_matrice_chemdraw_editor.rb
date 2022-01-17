class MatriceChemdrawEditor < ActiveRecord::Migration[4.2]
  def change
    Matrice.create(name: 'chemdrawEditor', enabled: false, label: 'chemdrawEditor', include_ids: [], exclude_ids: [], configs: { editor: 'chemdraw' } ) if Matrice.find_by(name: 'chemdrawEditor').nil?
  end
end

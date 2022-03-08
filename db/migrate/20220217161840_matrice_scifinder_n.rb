class MatriceScifinderN < ActiveRecord::Migration[5.2]
  def self.up
    Matrice.create(name: 'scifinderN', enabled: false, label: 'scifinderN', include_ids: [], exclude_ids: [])
  end

  def self.down
    Matrice.find_by(name: 'scifinderN')&.really_destroy!
  end
end

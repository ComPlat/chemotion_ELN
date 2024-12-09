class MatriceUserProvider < ActiveRecord::Migration[5.2]
  def up
    Matrice.create(
      name: 'userProvider',
      enabled: false,
      label: 'userProvider',
      include_ids: [],
      exclude_ids: [],
      configs: {}
    ) unless Matrice.find_by(name: 'userProvider')
  end

  def down
    Matrice.find_by(name: 'userProvider')&.really_destroy!
  end
end

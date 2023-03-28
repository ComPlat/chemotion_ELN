class MatriceUserProvider < ActiveRecord::Migration[5.2]
  def change
    Matrice.create(
      name: 'userProvider',
      enabled: false,
      label: 'userProvider',
      include_ids: [],
      exclude_ids: [],
      configs: {}
    )
  end
end

class MatriceUserLabel < ActiveRecord::Migration
  def change
    Matrice.create(
      name: 'userLabel',
      enabled: false,
      label: 'userLabel',
      include_ids: [],
      exclude_ids: []
    )
  end
end

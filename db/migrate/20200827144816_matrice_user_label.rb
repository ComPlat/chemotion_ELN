class MatriceUserLabel < ActiveRecord::Migration
  def change
    Matrice.create(
      name: 'UserLabel',
      enabled: false,
      label: 'UserLabel',
      include_ids: [],
      exclude_ids: []
    )
  end
end

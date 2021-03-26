class MatriceSampleDecoupled < ActiveRecord::Migration
  def change
    Matrice.create(
      name: 'sampleDecoupled',
      enabled: false,
      label: 'sampleDecoupled',
      include_ids: [],
      exclude_ids: []
    )
  end
end

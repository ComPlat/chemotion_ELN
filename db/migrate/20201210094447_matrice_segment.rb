class MatriceSegment < ActiveRecord::Migration
  def change
    Matrice.create(
      name: 'segment',
      enabled: false,
      label: 'segment',
      include_ids: [],
      exclude_ids: []
    )
  end
end

class AddSegmentIdentifier < ActiveRecord::Migration[5.2]
  def change
    add_column :segment_klasses, :identifier, :string unless column_exists? :segment_klasses, :identifier
  end
end

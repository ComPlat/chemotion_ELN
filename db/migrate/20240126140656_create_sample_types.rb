class CreateSampleTypes < ActiveRecord::Migration[6.1]
  def change
    create_table :sample_types do |t|
      t.references :sample, foreign_key: true, null: false
      t.references :sampleable, polymorphic: true, null: false

      t.timestamps
    end
  end
end

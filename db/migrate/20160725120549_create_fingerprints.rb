class CreateFingerprints < ActiveRecord::Migration
  def change
    create_table :fingerprints do |t|
      t.bit      :fp0,           limit: 64
      t.bit      :fp1,           limit: 64
      t.bit      :fp2,           limit: 64
      t.bit      :fp3,           limit: 64
      t.bit      :fp4,           limit: 64
      t.bit      :fp5,           limit: 64
      t.bit      :fp6,           limit: 64
      t.bit      :fp7,           limit: 64
      t.bit      :fp8,           limit: 64
      t.bit      :fp9,           limit: 64
      t.bit      :fp10,          limit: 64
      t.bit      :fp11,          limit: 64
      t.bit      :fp12,          limit: 64
      t.bit      :fp13,          limit: 64
      t.bit      :fp14,          limit: 64
      t.bit      :fp15,          limit: 64
      t.integer  :num_set_bits,  limit: 1

      t.timestamps null: false
      t.time :deleted_at
    end

    Sample.reset_column_information
    add_column :samples, :fingerprint_id, :integer

  end
end

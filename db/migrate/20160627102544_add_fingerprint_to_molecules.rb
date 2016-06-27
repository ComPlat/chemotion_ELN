class AddFingerprintToMolecules < ActiveRecord::Migration
  def change
    add_column :molecules, :fp0, :bigserial
    add_column :molecules, :fp1, :bigserial
    add_column :molecules, :fp2, :bigserial
    add_column :molecules, :fp3, :bigserial
    add_column :molecules, :fp4, :bigserial
    add_column :molecules, :fp5, :bigserial
    add_column :molecules, :fp6, :bigserial
    add_column :molecules, :fp7, :bigserial
    add_column :molecules, :fp8, :bigserial
    add_column :molecules, :fp9, :bigserial
    add_column :molecules, :fp10, :bigserial
    add_column :molecules, :fp11, :bigserial
    add_column :molecules, :fp12, :bigserial
    add_column :molecules, :fp13, :bigserial
    add_column :molecules, :fp14, :bigserial
    add_column :molecules, :fp15, :bigserial
  end
end

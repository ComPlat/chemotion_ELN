class CreatePostTranslationalModifications < ActiveRecord::Migration[6.1]
  def change
    index_prefix = 'idx_sbmm_ptm'
    create_table :post_translational_modifications do |t|
      t.boolean :phosphorylation_enabled, default: false, null: false
      t.boolean :phosphorylation_ser_enabled, default: false, null: false
      t.string :phosphorylation_ser_details, null: true, default: ''
      t.boolean :phosphorylation_thr_enabled, default: false, null: false
      t.string :phosphorylation_thr_details, null: true, default: ''
      t.boolean :phosphorylation_tyr_enabled, default: false, null: false
      t.string :phosphorylation_tyr_details, null: true, default: ''

      t.boolean :glycosylation_enabled, null: false, default: false
      t.boolean :glycosylation_n_linked_asn_enabled, null: false, default: false
      t.string :glycosylation_n_linked_asn_details, null: true, default: ''
      t.boolean :glycosylation_n_linked_lys_enabled, null: false, default: false
      t.string :glycosylation_n_linked_lys_details, null: true, default: ''
      t.boolean :glycosylation_n_linked_ser_enabled, null: false, default: false
      t.string :glycosylation_n_linked_ser_details, null: true, default: ''
      t.boolean :glycosylation_n_linked_thr_enabled, null: false, default: false
      t.string :glycosylation_n_linked_thr_details, null: true, default: ''
      t.boolean :glycosylation_o_linked_asn_enabled, null: false, default: false
      t.string :glycosylation_o_linked_asn_details, null: true, default: ''
      t.boolean :glycosylation_o_linked_lys_enabled, null: false, default: false
      t.string :glycosylation_o_linked_lys_details, null: true, default: ''
      t.boolean :glycosylation_o_linked_ser_enabled, null: false, default: false
      t.string :glycosylation_o_linked_ser_details, null: true, default: ''
      t.boolean :glycosylation_o_linked_thr_enabled, null: false, default: false
      t.string :glycosylation_o_linked_thr_details, null: true, default: ''

      t.boolean :acetylation_enabled, null: false, default: false
      t.float :acetylation_lysin_number, null: true

      t.boolean :hydroxylation_enabled, null: false, default: false
      t.boolean :hydroxylation_lys_enabled, null: false, default: false
      t.string :hydroxylation_lys_details, null: true, default: true
      t.boolean :hydroxylation_pro_enabled, null: false, default: false
      t.string :hydroxylation_pro_details, null: true, default: true

      t.boolean :methylation_enabled, null: false, default: false
      t.boolean :methylation_arg_enabled, null: false, default: false
      t.string :methylation_arg_details, null: true, default: ''
      t.boolean :methylation_glu_enabled, null: false, default: false
      t.string :methylation_glu_details, null: true, default: ''
      t.boolean :methylation_lys_enabled, null: false, default: false
      t.string :methylation_lys_details, null: true, default: ''

      t.boolean :other_modifications_enabled, null: false, default: false
      t.string :other_modifications_details, null: true, default: ''
      t.datetime :deleted_at, null: true, index: { name: "#{index_prefix}_deleted_at" }
      t.timestamps
    end
  end
end

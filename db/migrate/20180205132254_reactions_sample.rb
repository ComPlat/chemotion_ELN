class ReactionsSample < ActiveRecord::Migration[4.2]
  def self.up
    create_table :reactions_samples do |t|
      t.integer :reaction_id
      t.integer :sample_id
      t.boolean :reference
      t.float :equivalent
      t.integer :position
      t.string :type
      t.datetime :deleted_at
      t.index :reaction_id
      t.index :sample_id
    end

    query = %w(
      ReactionsStartingMaterialSample ReactionsReactantSample
      ReactionsSolventSample ReactionsProductSample
    ).map do |klass_type|
      <<~SQL
      select reaction_id, sample_id, reference, equivalent, deleted_at, '#{klass_type}' as "type"
      from #{klass_type.tableize}
      SQL
    end.join(' union ').concat(' order by reaction_id')

    previous_data  = ActiveRecord::Base.connection.exec_query(query)
    return if previous_data.count.zero?
    columns = previous_data.columns.join(',')  # "reaction_id,sample_id,reference,equivalent,deleted_at,type"
    values = previous_data.map do |val|
      v = val.map{|_, vv| vv.presence && "'#{vv}'" || 'null'}.join(',')
      "(#{v})"
    end.join(',')

    ActiveRecord::Base.connection.exec_query(
      "INSERT INTO reactions_samples (#{columns}) VALUES #{values}"
    )
    # [
      # :reactions_starting_material_samples, :reactions_reactant_samples,
      # :reactions_solvent_samples, :reactions_product_samples
    # ].each{ |table| drop_table table}
  end




  def down
    [
      :reactions_starting_material_samples, :reactions_reactant_samples,
      :reactions_solvent_samples, :reactions_product_samples
    ].each do |table|
      create_table table do |t|
        t.integer :reaction_id
        t.integer :sample_id
        t.boolean :reference
        t.float :equivalent
        t.integer :position
        t.datetime :deleted_at
        t.index :reaction_id
      end unless table_exists?(table)
    end

    # drop_table :reaction_samples
  end
end

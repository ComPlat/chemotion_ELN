class PubchemCidCuration < ActiveRecord::Migration
  def change
    return unless table_exists? :element_tags
    return unless column_exists? :element_tags, :taggable_type
    return unless column_exists? :element_tags, :taggable_data
    ElementTag.where(taggable_type: 'Molecule').where("taggable_data->>'pubchem_cid' like 'Status%'").find_each do |et|
      data = et.taggable_data
      data['pubchem_cid'] = nil
      et.update_columns(taggable_data: data)
    end
  end
end

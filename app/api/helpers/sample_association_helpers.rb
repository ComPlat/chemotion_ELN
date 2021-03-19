module SampleAssociationHelpers
  extend Grape::API::Helpers

  def split_sample(sid, cols, current_user)
    parent_sample = Sample.find(sid)
    subsample = parent_sample.create_subsample(current_user, cols, true)
    subsample.save!
    subsample.reload
    subsample
  end

  def update_sample_association(element, properties, current_user)
    sds = []
    properties.keys.each do |key|
      layer = properties[key]
      field_samples = layer['fields'].select { |ss| ss['type'] == 'drag_sample' }
      field_samples.each do |field|
        idx = properties[key]['fields'].index(field)
        next unless properties.dig(key, 'fields', idx, 'value', 'is_new') == true
        sid = field.dig('value', 'el_id')
        subsample = split_sample(sid, element.collections, current_user) unless sid.nil?
        next if subsample.nil?

        sds << subsample.id
        properties[key]['fields'][idx]['value']['el_id'] = subsample.id
        properties[key]['fields'][idx]['value']['el_label'] = subsample.short_label
        properties[key]['fields'][idx]['value']['el_tip'] = subsample.short_label
        properties[key]['fields'][idx]['value']['is_new'] = false
        ElementsSample.find_or_create_by(element_id: element.id, sample_id: subsample.id)
      end
    end
    ElementsSample.where(element_id: element.id).where.not(sample_id: sds).destroy_all unless sds.empty?
    properties
  end
end #module

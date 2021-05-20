# frozen_string_literal: true

# Helper for associated sample
module SampleAssociationHelpers
  extend Grape::API::Helpers

  def build_sample(sid, cols, current_user, cr_opt)
    parent_sample = Sample.find(sid)

    case cr_opt
    when 0
      subsample = parent_sample
      collections = Collection.where(id: cols).where.not(id: subsample.collections.pluck(:id))
      subsample.collections << collections unless collections.empty?
    when 1
      subsample = parent_sample.create_subsample(current_user, cols, true)
    when 2
      subsample = parent_sample.dup
      collections = (Collection.where(id: cols) | Collection.where(user_id: current_user.id, label: 'All', is_locked: true))
      subsample.collections << collections
      subsample.container = Container.create_root_container
    else
      return nil
    end

    return nil if subsample.nil?

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
        sid = field.dig('value', 'el_id')
        next if sid.blank?

        sds << sid unless properties.dig(key, 'fields', idx, 'value', 'is_new') == true
        next unless properties.dig(key, 'fields', idx, 'value', 'is_new') == true

        cr_opt = field.dig('value', 'cr_opt')

        subsample = build_sample(sid, element.collections, current_user, cr_opt) unless sid.nil? || cr_opt.nil?
        next if subsample.nil?

        sds << subsample.id
        properties[key]['fields'][idx]['value']['el_id'] = subsample.id
        properties[key]['fields'][idx]['value']['el_label'] = subsample.short_label
        properties[key]['fields'][idx]['value']['el_tip'] = subsample.short_label
        properties[key]['fields'][idx]['value']['is_new'] = false
        ElementsSample.find_or_create_by(element_id: element.id, sample_id: subsample.id)
      end
    end
    ElementsSample.where(element_id: element.id).where.not(sample_id: sds)&.destroy_all
    properties
  end
end

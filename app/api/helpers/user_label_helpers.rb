# frozen_string_literal: true

module UserLabelHelpers
  extend Grape::API::Helpers

  def update_element_labels(element, user_labels, user_id)
    tag = element.tag
    return if tag.nil?

    data = tag.taggable_data || {}
    pri_labels = UserLabel.where(id: data['user_labels'], access_level: [0, 1]).where.not(user_id: user_id).pluck(:id)
    data['user_labels'] = ((user_labels || []) + pri_labels)&.uniq
    tag.taggable_data = data
    tag.save!
  end

  # Adds `add_ids` to and removes `remove_ids` from an element's user_labels,
  # preserving labels owned by other users that the caller cannot manage.
  def bulk_apply_element_labels(element, add_ids, remove_ids, user_id)
    tag = element.tag
    return if tag.nil?

    data = tag.taggable_data || {}
    existing = Array(data['user_labels']).map(&:to_i)
    # labels on the element owned by someone else that the caller can't touch
    pri_labels = UserLabel.where(id: existing, access_level: [0, 1]).where.not(user_id: user_id).pluck(:id)

    writable = existing - pri_labels
    updated = ((writable + Array(add_ids).map(&:to_i)).uniq - Array(remove_ids).map(&:to_i)) + pri_labels
    data['user_labels'] = updated.uniq
    tag.taggable_data = data
    tag.save!
  end
end

# frozen_string_literal: true

module UserLabelHelpers
  extend Grape::API::Helpers

  def update_element_labels(element, user_labels, user_id)
    tag = ElementTag.find_by(taggable: element)
    data = tag.taggable_data || {}
    pri_labels = UserLabel.where(id: data['user_labels'], access_level: [0, 1]).where.not(user_id: user_id).pluck(:id)
    data['user_labels'] = ((user_labels || []) + pri_labels)&.uniq
    tag.save!
  end
end

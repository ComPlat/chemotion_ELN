module UserLabelHelpers
  extend Grape::API::Helpers

  def update_element_labels(element, user_labels, current_user_id)
    tag = ElementTag.find_by(taggable: element)
    data = tag.taggable_data || {}
    private_labels = UserLabel.where(id: data['user_labels'], access_level: [0, 1]).where.not(user_id: current_user_id).pluck(:id)
    data['user_labels'] = ((user_labels || []) + private_labels)&.uniq
    tag.save!
  end
end
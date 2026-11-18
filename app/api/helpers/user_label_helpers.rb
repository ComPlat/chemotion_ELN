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

  # Adds `add_ids` to and removes `remove_ids` from the user_labels of every
  # element in `scope`, preserving labels owned by other users that the caller
  # cannot manage. Eager-loads tags and resolves the set of "foreign private"
  # labels once per batch to avoid a per-element query fan-out.
  def bulk_apply_labels_to_scope(scope, add_ids, remove_ids, user_id)
    add = Array(add_ids).map(&:to_i)
    remove = Array(remove_ids).map(&:to_i)

    scope.includes(:tag).find_in_batches(batch_size: 500) do |batch|
      tags = batch.filter_map(&:tag)
      next if tags.empty?

      # one query per batch: which currently-applied labels are private and
      # owned by someone else, so the caller must not touch them
      existing_ids = tags.flat_map { |tag| Array(tag.taggable_data&.dig('user_labels')).map(&:to_i) }.uniq
      foreign_private = existing_ids.empty? ? [] : UserLabel.where(id: existing_ids, access_level: [0, 1])
                                                            .where.not(user_id: user_id).pluck(:id)
      foreign_private = foreign_private.to_set

      tags.each do |tag|
        data = tag.taggable_data || {}
        existing = Array(data['user_labels']).map(&:to_i)
        pri_labels = existing.select { |id| foreign_private.include?(id) }
        writable = existing - pri_labels
        data['user_labels'] = (((writable + add).uniq - remove) + pri_labels).uniq
        tag.taggable_data = data
        tag.save!
      end
    end
  end
end

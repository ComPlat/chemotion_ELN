# frozen_string_literal: true

module Collectable
  extend ActiveSupport::Concern
  included do
    scope :for_user, lambda { |user_id|
                       joins(:collections).where(collections: { user_id: user_id }).references(:collections)
                     }
    scope :for_user_n_groups, lambda { |user_ids|
                                joins(:collections).where(collections: { user_id: user_ids }).references(:collections)
                              }
    scope :by_collection_id, ->(id) { joins(:collections).where(collections: { id: id }) }
    scope :search_by, ->(search_by_method, arg) { public_send("search_by_#{search_by_method}", arg) }
    scope :by_user_label, ->(id) { joins(:tag).where("element_tags.taggable_data->'user_labels' @> '?'", id) }

    # TODO: Filters are not working properly
    # the following scopes are not working as I would expect
    # in the ui the selection is a date but in the api we are getting a timestamp,
    # which we are parsing whiteout timezone information, so we lose some hours
    # dayjs('2019-01-25').unix() // 1548381600 is Time.at(1548381600) 2019-01-25 03:00:00 +0100
    # I would suggest the following:
    # send date from frontend and use the psql date method: where("date(#{table_name}.created_at) <= ?", date) or
    # remove + 1.day part from created_time_to and updated_time_to scopes and use .end_of_day and
    # use beginning_of_day for the from scopes: where("#{table_name}.created_at >= ?", time.beginning_of_day)
    scope :created_time_to, ->(time) { where("#{table_name}.created_at <= ?", time) }
    scope :created_time_from, ->(time) { where("#{table_name}.created_at >= ?", time) }
    scope :updated_time_to, ->(time) { where("#{table_name}.updated_at <= ?", time) }
    scope :updated_time_from, ->(time) { where("#{table_name}.updated_at >= ?", time) }

    scope :join_collections_element, lambda {
      tb = name.underscore
      joins("inner join collections_#{tb}s on #{tb}s.id = collections_#{tb}s.sample_id")
    }
  end

  class_methods do
    # Get the proper ActiveRecord model class of the join collection-element model
    #   independent of the names of the models
    # @example
    #   - Sample => CollectionSample
    #   - CelllineSample => CollectionsCellline
    #   - Labimotion::Element => Labimotion::CollectionElement
    #   - User => nil
    #
    # @todo define this as a constant but would need for the concern to be included
    #  after the definition of the collections association in the models.
    #
    # @return [Class<ActiveRecord>, nil] that models the register collection-element join reflection
    #   between the current AR model and the AR Collection model (or nil if none)
    def collections_element_class
      through_asso = reflect_on_association(:collections)&.options&.fetch(:through, nil)
      through_asso && reflect_on_association(through_asso)&.klass
    end
  end
end

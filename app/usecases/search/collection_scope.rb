# frozen_string_literal: true

module Usecases
  module Search
    # The collections a search runs over, together with the detail levels the user holds on each.
    #
    # Every search query is built from this object instead of a single collection id, so that the
    # set of collections, and the detail level that gates each part of a search, are decided in one
    # place. Callers narrow the scope to the collections that grant a level ({#at_least}) and then
    # ask for an element type's records in what is left ({#relation_for}).
    class CollectionScope
      attr_reader :user, :collections

      # @param user [User]
      # @param collections [Array<Collection>] collections already resolved as accessible to +user+
      def initialize(user:, collections:)
        @user = user
        @collections = collections.uniq
      end

      # @return [Array<Integer>]
      def ids
        @ids ||= collections.map(&:id)
      end

      delegate :empty?, to: :collections

      # The subset of this scope in which +user+ holds at least +min+ on +level_key+.
      #
      # @param level_key [Symbol] one of Collection::DETAIL_LEVEL_KEYS
      # @param min [Integer]
      # @return [CollectionScope]
      def at_least(level_key, min)
        unless Collection::DETAIL_LEVEL_KEYS.include?(level_key)
          raise ArgumentError, "unknown detail level #{level_key}"
        end

        subset = collections.select { |collection| (levels_for(collection)[level_key] || 0) >= min }
        self.class.new(user: user, collections: subset).tap { |scope| scope.levels_by_id = levels_by_id }
      end

      # +model+'s records that belong to at least one collection of this scope. Membership is
      # matched with a subquery on the collection join table, not a join, so a record held by
      # several of the collections is returned once.
      #
      # @param model [Class] an element model with a +collections+ has_many :through association
      # @return [ActiveRecord::Relation]
      def relation_for(model)
        return model.none if empty?

        # The join model must belong to a collection itself: a model reaching collections through
        # another element (e.g. Molecule through samples) is not held in them.
        join = model.reflect_on_association(:collections)&.through_reflection
        unless join&.klass&.reflect_on_association(:collection)
          raise ArgumentError, "#{model} is not held in collections"
        end

        model.where(id: join.klass.where(collection_id: ids).select(join.foreign_key))
      end

      # One detail level per key, valid for every collection of the scope: the lowest level the user
      # holds across them. For a single collection this is exactly its levels; for several it never
      # grants more than any one of them does.
      #
      # @return [Hash{Symbol => Integer}] every key of Collection::DETAIL_LEVEL_KEYS
      def detail_levels
        @detail_levels ||= Collection::DETAIL_LEVEL_KEYS.index_with do |key|
          collections.map { |collection| levels_for(collection)[key] || 0 }.min || 0
        end
      end

      # {#detail_levels} keyed by element class, as the entities expect them.
      #
      # @return [Hash{Class => Integer}]
      def class_detail_levels
        @class_detail_levels ||= ElementDetailLevelCalculator.for_detail_levels(detail_levels)
      end

      protected

      attr_writer :levels_by_id

      def levels_by_id
        @levels_by_id ||= {}
      end

      private

      def levels_for(collection)
        levels_by_id[collection.id] ||= collection.detail_levels_for_user(user)
      end
    end
  end
end

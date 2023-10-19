# frozen_string_literal: true

module Usecases
  module Sharing
    class ShareWithUser
      def initialize(**params)
        @params = params
        @collection_attributes = @params.fetch(:collection_attributes, {})
        @current_user_id = @collection_attributes[:shared_by_id]
      end

      def execute! # rubocop:disable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Metrics/AbcSize, Metrics/MethodLength
        ActiveRecord::Base.transaction do # rubocop:disable Metrics/BlockLength
          c = Collection.create(@collection_attributes)
          sample_ids = @params.fetch(:sample_ids, [])
          reaction_ids =  @params.fetch(:reaction_ids, [])
          wellplate_ids = @params.fetch(:wellplate_ids, [])
          screen_ids = @params.fetch(:screen_ids, [])
          research_plan_ids = @params.fetch(:research_plan_ids, [])
          element_ids = @params.fetch(:element_ids, [])

          # Reactions and Wellplates have associated Samples
          associated_sample_ids = Sample.associated_by_user_id_and_reaction_ids(@current_user_id, reaction_ids).map(&:id) + Sample.associated_by_user_id_and_wellplate_ids(@current_user_id, wellplate_ids).map(&:id)
          # Screens have associated Wellplates
          associated_wellplate_ids = Wellplate.associated_by_user_id_and_screen_ids(@current_user_id, screen_ids).map(&:id)

          sample_ids = (sample_ids + associated_sample_ids).uniq
          wellplate_ids = (wellplate_ids + associated_wellplate_ids).uniq

          # find or create and assign parent collection ()
          root_label = format('with %s', c.user.name_abbreviation)
          root_collection_attributes = {
            user_id: @collection_attributes[:user_id],
            shared_by_id: @current_user_id,
            is_locked: true,
            is_shared: true
          }

          rc = Collection.only_deleted.find_by(**root_collection_attributes)&.restore
          rc ||= Collection.find_or_create_by(**root_collection_attributes, label: root_label)
          c.update(parent: rc)

          sample_ids.each do |sample_id|
            CollectionsSample.create(collection_id: c.id, sample_id: sample_id)
          end

          reaction_ids.each do |reaction_id|
            CollectionsReaction.create(collection_id: c.id, reaction_id: reaction_id)
          end

          wellplate_ids.each do |wellplate_id|
            CollectionsWellplate.create(collection_id: c.id, wellplate_id: wellplate_id)
          end

          screen_ids.each do |screen_id|
            CollectionsScreen.create(collection_id: c.id, screen_id: screen_id)
          end

          research_plan_ids.each do |research_plan_id|
            CollectionsResearchPlan.create(collection_id: c.id, research_plan_id: research_plan_id)
          end

          element_ids.each do |k, ids|
            ids.each do |element_id|
              Labimotion::CollectionsElement.create(collection_id: c.id, element_id: element_id, element_type: k)
            end
          end

          # SendSharingNotificationJob.perform_later(@user, '')
        end
      end
    end
  end
end

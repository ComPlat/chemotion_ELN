# frozen_string_literal: true

module Usecases
  module Sharing
    class TakeOwnership
      def initialize(params)
        @params = params
      end

      def execute!
        if @params[:is_sync]
          new_owner_id = @params[:current_user_id]
          rsc = SyncCollectionsUser.find(@params[:id])
          o_owner_id = rsc.shared_by_id
          # if user already owns the (unshared) collection, there is nothing to do here
          return if rsc.shared_by_id == new_owner_id

          cols = Collection.where([' id = ? or ancestry = ?  or ancestry like ? or ancestry like ? or ancestry like ? ',
                                   rsc.collection_id, rsc.collection_id.to_s, '%/' + rsc.collection_id.to_s, rsc.collection_id.to_s + '/%',
                                   '%/' + rsc.collection_id.to_s + '/%'])
               
          user = User.find_by(id: new_owner_id)
          col = Collection.find_by(id: rsc.collection_id)
          cols.each do |c|
            previous_owner_id = rsc.shared_by_id
            root_label = format('with %s', User.find(previous_owner_id).name_abbreviation)
            root_collection_attributes = {
              label: root_label,
              user_id: previous_owner_id,
              shared_by_id: new_owner_id,
              is_locked: true,
              is_shared: true
            }

            sample_ids = CollectionsSample.where(collection_id: c.id).pluck(:sample_id)
            samples = get_samples_belong_to_many_collections(sample_ids)
            if samples.length.positive?
              Message.create_msg_notification(
                channel_subject: Channel::COLLECTION_TAKE_OWNERSHIP_FAIL_SAMPLE_IN_MULTIPLE_COLLECTIONS,
                data_args: { new_owner: user.name, collection_name: col.label, samples: samples.map(&:short_label).join(', ')},
                message_from: new_owner_id, message_to: [o_owner_id]
              )

              return { ok: false, statusText: "These samples are belogn to many collections : #{samples.map(&:short_label).join(', ')}" }
            end

            clone_elements_to_all_collections(c.id, new_owner_id, o_owner_id)
            sc = SyncCollectionsUser.find_by(collection_id: c.id, user_id: new_owner_id)
            sc_all = SyncCollectionsUser.where(collection_id: c.id, shared_by_id: c.user_id)
            ActiveRecord::Base.transaction do
              if c.id == rsc.collection_id
                c.update(user_id: new_owner_id, ancestry: nil)
              else
                c.update(user_id: new_owner_id)
              end
              rc = Collection.find_or_create_by(root_collection_attributes)
              sc&.update(user_id: previous_owner_id, shared_by_id: new_owner_id, fake_ancestry: rc.id.to_s)
              sc_all.each do |sc|
                next if sc.user_id == new_owner_id

                ancestry_label = format('with %s', User.find(sc.user_id).name_abbreviation)
                root_collection_attrs = {
                  label: ancestry_label,
                  user_id: sc.user_id,
                  shared_by_id: new_owner_id,
                  is_locked: true,
                  is_shared: true
                }
                rca = Collection.find_or_create_by(root_collection_attrs)
                sc.update(shared_by_id: new_owner_id, fake_ancestry: rca.id.to_s)
              end
            end
          end

          Message.create_msg_notification(
            channel_subject: Channel::COLLECTION_TAKE_OWNERSHIP,
            data_args: { new_owner: user.name, collection_name: col.label },
            message_from: new_owner_id, message_to: [o_owner_id]
          )
        else
          c = Collection.find(@params[:id])
          # if user already owns the (unshared) collection, there is nothing to do here
          return if (c.user_id == @params[:current_user_id]) && (c.is_shared == false)

          sample_ids = c.samples.pluck(:id)
          reaction_ids = c.reactions.pluck(:id)
          wellplate_ids = c.wellplates.pluck(:id)
          screen_ids = c.screens.pluck(:id)

          owner = User.find(c.shared_by_id)
          owner_collections = owner.collections
          owner_sample_collections = owner_collections.includes(:samples).where('samples.id IN (?)', sample_ids).references(:samples)
          owner_reaction_collections = owner_collections.includes(:reactions).where('reactions.id IN (?)', reaction_ids).references(:reacions)
          owner_wellplate_collections = owner_collections.includes(:wellplates).where('wellplates.id IN (?)', wellplate_ids).references(:wellplates)
          owner_screen_collections = owner_collections.includes(:screens).where('screens.id IN (?)', screen_ids).references(:screens)

          ActiveRecord::Base.transaction do
            c.update(is_shared: false, parent: nil, shared_by_id: nil)

            # delete all associations of former_owner to elements included in c
            CollectionsSample.where('sample_id IN (?) AND collection_id IN (?)', sample_ids, owner_sample_collections.pluck(:id)).delete_all
            CollectionsReaction.where('reaction_id IN (?) AND collection_id IN (?)', reaction_ids, owner_reaction_collections.pluck(:id)).delete_all
            CollectionsWellplate.where('wellplate_id IN (?) AND collection_id IN (?)', wellplate_ids, owner_wellplate_collections.pluck(:id)).delete_all
            CollectionsScreen.where('screen_id IN (?) AND collection_id IN (?)', screen_ids, owner_screen_collections.pluck(:id)).delete_all
          end
        end

        { ok: true, statusText: 'Successfully!' }
      end

      def clone_elements_to_all_collections(collection_id, new_owner_id, old_owner_id)
        new_all_collection_id = Collection.get_all_collection_for_user(new_owner_id).id
        old_all_collection_id = Collection.get_all_collection_for_user(old_owner_id).id

        sample_ids = CollectionsSample.where(collection_id: collection_id).pluck(:sample_id)
        CollectionsSample.move_to_collection(sample_ids, old_all_collection_id, new_all_collection_id)

        reaction_ids = CollectionsReaction.where(collection_id: collection_id).pluck(:reaction_id)
        CollectionsReaction.move_to_collection(reaction_ids, old_all_collection_id, new_all_collection_id)

        wellplate_ids = CollectionsWellplate.where(collection_id: collection_id).pluck(:wellplate_id)
        CollectionsWellplate.move_to_collection(wellplate_ids, old_all_collection_id, new_all_collection_id)

        screen_ids = CollectionsScreen.where(collection_id: collection_id).pluck(:screen_id)
        CollectionsScreen.move_to_collection(screen_ids, old_all_collection_id, new_all_collection_id)

        plan_ids = CollectionsResearchPlan.where(collection_id: collection_id).pluck(:research_plan_id)
        CollectionsResearchPlan.move_to_collection(plan_ids, old_all_collection_id, new_all_collection_id)
      end

      def get_samples_belong_to_many_collections(sample_ids)
        samples = []
        sample_ids.each do |sample_id|
          collection_ids = CollectionsSample.where(sample_id: sample_id).pluck(:collection_id).to_set
          next if collection_ids.length < 2

          samples << Sample.find(sample_id)
        end

        samples
      end
    end
  end
end

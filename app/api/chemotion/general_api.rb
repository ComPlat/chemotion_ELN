module Chemotion
  class GeneralAPI < Grape::API

    resource :general do
      desc "return selected elements from the list."
      params do
        requires :ids, type: Hash, coerce_with: -> (val) { JSON.parse(val) }
      end
      get :list_content do
        sample_ids = params[:ids][:sample]
        reaction_ids = params[:ids][:reaction]

        ss = Sample.for_user(current_user.id).where(id: sample_ids).includes(:molecule, :residues, collections: :sync_collections_users).uniq
        rs = Reaction.for_user(current_user.id).where(id: reaction_ids).includes(collections: :sync_collections_users).uniq
        samples = ss.map do |s|
          ElementPermissionProxy.new(current_user, s, user_ids).serialized
        end
        reactions = rs.map do |r|
          ElementPermissionProxy.new(current_user, r, user_ids).serialized
        end
        return { samples: samples, reactions: reactions}
      end
    end
  end
end

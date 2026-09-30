# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class ProvenanceEntity < Grape::Entity
      expose(:reaction_process_id,
             :starts_at,
             :city,
             :doi,
             :patent,
             :publication_url,
             :username,
             :name,
             :orcid,
             :organization,
             :email)
    end
  end
end

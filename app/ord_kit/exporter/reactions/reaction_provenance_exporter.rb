# frozen_string_literal: true

module OrdKit
  module Exporter
    module Reactions
      class ReactionProvenanceExporter < OrdKit::Exporter::Base
        def to_ord
          return unless model

          OrdKit::ReactionProvenance.new(
            experimenter: experimenter,
            city: model.city,
            experiment_start: experiment_start,
            doi: model.doi,
            patent: model.patent,
            publication_url: model.publication_url,
            record_created: record_event(model.created_at),
            record_modified: nil, # Can be a series of modifications. We have no concept yet to store modifications to reactions.
          )
        end

        private

        def experimenter
          OrdKit::Person.new(
            username: model.username,
            name: model.name,
            orcid: model.orcid,
            organization: model.organization,
            email: model.email,
          )
        end

        def experiment_start
          OrdKit::DateTime.new(
            value: model.starts_at&.iso8601,
          )
        end

        def record_event(_datetime)
          OrdKit::RecordEvent.new(
            time: ord_date_time_for(model.created_at),
            person: experimenter,
            details: nil,
          )
        end

        def ord_date_time_for(time)
          OrdKit::DateTime.new(
            value: time&.iso8601,
          )
        end
      end
    end
  end
end

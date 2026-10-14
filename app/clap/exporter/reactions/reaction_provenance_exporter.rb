# frozen_string_literal: true

module Clap
  module Exporter
    module Reactions
      class ReactionProvenanceExporter < Clap::Exporter::Base
        def to_clap
          return unless model

          Clap::ReactionProvenance.new(
            experimenter: experimenter,
            city: model.city,
            experiment_start: experiment_start,
            doi: model.doi,
            patent: model.patent,
            publication_url: model.publication_url,
            record_created: record_event(model.created_at),
            record_modified: nil, # ELN has no concept for recording modifications to reactions.
          )
        end

        private

        def experimenter
          Clap::Person.new(
            username: model.username,
            name: model.name,
            orcid: model.orcid,
            organization: model.organization,
            email: model.email,
          )
        end

        def experiment_start
          Clap::DateTime.new(
            value: model.starts_at&.iso8601,
          )
        end

        def record_event(_datetime)
          Clap::RecordEvent.new(
            time: ord_date_time_for(model.created_at),
            person: experimenter,
            details: nil,
          )
        end

        def ord_date_time_for(time)
          Clap::DateTime.new(
            value: time&.iso8601,
          )
        end
      end
    end
  end
end

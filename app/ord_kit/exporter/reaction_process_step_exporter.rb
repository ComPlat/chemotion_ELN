# frozen_string_literal: true

module OrdKit
  module Exporter
    class ReactionProcessStepExporter < OrdKit::Exporter::Base
      def to_ord(starts_at:)
        OrdKit::ReactionStep.new(
          reaction_step_id: model.id,
          position: model.position + 1,
          setup: setup,
          actions: reaction_process_activities,
          start_time: start_time(starts_at),
          duration: duration,
          outcomes: outcomes,
        )
      end

      private

      def setup
        Reactions::ReactionSetupExporter.new(model).to_ord
      end

      def reaction_process_activities
        start_times = process_activities.inject([0]) do |starts, rps|
          starts << (starts.last + rps.workup['duration'].to_i)
        end
        process_activities.map.with_index do |activity, idx|
          ReactionProcessActivityExporter.new(activity).to_ord(starts_at: start_times[idx])
        end
      end

      def process_activities
        model.reaction_process_activities.order(:position)
      end

      def start_time(starts_at)
        OrdKit::Time.new(
          value: starts_at.to_i / 1000, # model.start_time.to_i,
          precision: nil,
          units: OrdKit::Time::TimeUnit::SECOND,
        )
      end

      def duration
        OrdKit::Time.new(
          value: model.duration.to_i / 1000,
          precision: nil,
          units: OrdKit::Time::TimeUnit::SECOND,
        )
      end

      def outcomes
        # TODO: We might want to collect saved intermediate samples
      end
    end
  end
end

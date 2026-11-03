# frozen_string_literal: true

module Clap
  module Exporter
    class ReactionProcessStepExporter < Clap::Exporter::Base
      def to_clap(starts_at:)
        Clap::ReactionStep.new(
          reaction_step_id: model.id,
          position: model.position + 1,
          start_time: start_time(starts_at),
          duration: duration,
          vessel_template: vessel_template,
          actions: reaction_process_activities,
          automation_mode: ontology_to_clap(model.automation_mode),
          automation_control: automation_control,
        )
      end

      private

      def automation_control
        Clap::Exporter::Models::StepAutomationControlExporter.new(model.automation_control).to_clap
      end

      def vessel_template
        Vessels::ReactionProcessVesselableExporter.new(model.reaction_process_vessel).to_clap
      end

      def reaction_process_activities
        process_activities = model.reaction_process_activities.order(:position)

        start_times = process_activities.inject([0]) do |starts, rps|
          starts << (starts.last + rps.workup['duration'].to_i)
        end
        process_activities.map.with_index do |activity, idx|
          ReactionProcessActivityExporter.new(activity).to_clap(starts_at: start_times[idx])
        end
      end

      def start_time(starts_at)
        Clap::Exporter::Metrics::TimeSpanExporter.new(starts_at).to_clap
      end

      def duration
        Clap::Exporter::Metrics::TimeSpanExporter.new(model.duration).to_clap
      end
    end
  end
end

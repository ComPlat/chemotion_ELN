# frozen_string_literal: true

module OrdKit
  module Exporter
    class ReactionProcessActivityExporter < OrdKit::Exporter::Base
      ACTION_EXPORTER = {
        ADD: OrdKit::Exporter::Actions::AddActionExporter,
        ANALYSIS: OrdKit::Exporter::Actions::AnalysisActionExporter,
        CONDITION: OrdKit::Exporter::Actions::ConditionsActionExporter,
        PURIFICATION: OrdKit::Exporter::Actions::PurificationActionExporter,
        REMOVE: OrdKit::Exporter::Actions::RemoveActionExporter,
        TRANSFER: OrdKit::Exporter::Actions::TransferActionExporter,
        WAIT: OrdKit::Exporter::Actions::WaitActionExporter,
        SAVE: OrdKit::Exporter::Actions::SaveSampleActionExporter,
      }.stringify_keys

      def to_ord(starts_at:)
        return unless ACTION_EXPORTER[model.activity_name] # TODO: What to do with unknown activity_names?

        ACTION_EXPORTER[model.activity_name].new(model).to_ord(starts_at: starts_at)
      end
    end
  end
end

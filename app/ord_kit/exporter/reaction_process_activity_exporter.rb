# frozen_string_literal: true

module OrdKit
  module Exporter
    class ReactionProcessActivityExporter < OrdKit::Exporter::Base
      ACTION_EXPORTER = {
        ADD: OrdKit::Exporter::Actions::AddActionExporter,
        ANALYSIS_CHROMATOGRAPHY: OrdKit::Exporter::Actions::Analysis::ChromatographyExporter,
        ANALYSIS_SPECTROSCOPY: OrdKit::Exporter::Actions::Analysis::SpectroscopyExporter,
        ANALYSIS_ELEMENTAL: OrdKit::Exporter::Actions::Analysis::ElementalExporter,
        CENTRIFUGATION: OrdKit::Exporter::Actions::Purification::CentrifugationExporter,
        CHROMATOGRAPHY: OrdKit::Exporter::Actions::Purification::ChromatographyExporter,
        CRYSTALLIZATION: OrdKit::Exporter::Actions::Purification::CrystallizationExporter,
        EXTRACTION: OrdKit::Exporter::Actions::Purification::ExtractionExporter,
        FILTRATION: OrdKit::Exporter::Actions::Purification::FiltrationExporter,
        EVAPORATION: OrdKit::Exporter::Actions::EvaporationActionExporter,
        CONDITION: OrdKit::Exporter::Actions::ConditionsActionExporter,
        DEFINE_FRACTION: OrdKit::Exporter::Actions::DefineFractionActionExporter,
        DISCARD: OrdKit::Exporter::Actions::DiscardActionExporter,
        TRANSFER: OrdKit::Exporter::Actions::TransferActionExporter,
        WAIT: OrdKit::Exporter::Actions::WaitActionExporter,
        SAVE: OrdKit::Exporter::Actions::SaveSampleActionExporter,
        MIXING: OrdKit::Exporter::Actions::MixingExporter,
        GAS_EXCHANGE: OrdKit::Exporter::Actions::GasExchangeActionExporter,
        # TODO: To be done are:
        # MIXING
        # GAS_EXCHANGE
        # EVAPORATION
      }.stringify_keys

      def to_ord(starts_at:)
        # TODO: What to do with unknown activity_names?
        return unless ACTION_EXPORTER[model.activity_name]

        ACTION_EXPORTER[model.activity_name].new(model).to_ord(starts_at: starts_at)
      end
    end
  end
end

# frozen_string_literal: true

module Clap
  module Exporter
    class ReactionProcessActivityExporter < Clap::Exporter::Base
      ACTION_EXPORTER = {
        ADD: Clap::Exporter::Actions::AddActionExporter,
        ANALYSIS_CHROMATOGRAPHY: Clap::Exporter::Actions::Analysis::ChromatographyExporter,
        ANALYSIS_SPECTROSCOPY: Clap::Exporter::Actions::Analysis::SpectroscopyExporter,
        ANALYSIS_ELEMENTAL: Clap::Exporter::Actions::Analysis::ElementalExporter,
        CENTRIFUGATION: Clap::Exporter::Actions::Purification::CentrifugationExporter,
        CHROMATOGRAPHY: Clap::Exporter::Actions::Purification::ChromatographyExporter,
        CRYSTALLIZATION: Clap::Exporter::Actions::Purification::CrystallizationExporter,
        EXTRACTION: Clap::Exporter::Actions::Purification::ExtractionExporter,
        FILTRATION: Clap::Exporter::Actions::Purification::FiltrationExporter,
        EVAPORATION: Clap::Exporter::Actions::EvaporationActionExporter,
        CONDITION: Clap::Exporter::Actions::ConditionsActionExporter,
        DEFINE_FRACTION: Clap::Exporter::Actions::DefineFractionActionExporter,
        DISCARD: Clap::Exporter::Actions::DiscardActionExporter,
        TRANSFER: Clap::Exporter::Actions::TransferActionExporter,
        WAIT: Clap::Exporter::Actions::WaitActionExporter,
        SAVE: Clap::Exporter::Actions::SaveSampleActionExporter,
        MIXING: Clap::Exporter::Actions::MixingActionExporter,
        GAS_EXCHANGE: Clap::Exporter::Actions::GasExchangeActionExporter,
      }.stringify_keys

      def to_clap(starts_at:)
        # TODO: What to do with unknown activity_names?
        return unless ACTION_EXPORTER[model.activity_name]

        ACTION_EXPORTER[model.activity_name].new(model).to_clap(starts_at: starts_at)
      end
    end
  end
end

# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class Base
        # Defines base structure of ReactionProcessAction Export
        # Provides implementation for the common methods details, duration,
        # Provides empty implementation action_type_attributes which needs to be implemented in subclasses.
        def initialize(action)
          @action = action
        end

        delegate :workup, to: :action

        def to_ord(starts_at:)
          OrdKit::ReactionProcessAction.new(
            {
              description: description,
              position: position,
              start_time: start_time(starts_at),
              duration: duration,
              equipment: equipment,
              vessel: Vessels::ReactionProcessVesselExporter.new(@action.reaction_process_vessel).to_ord,
            }.merge(action_type_attributes),
          )
          # rescue StandardError => e
          #   raise StandardError,  workup.to_s + e.to_s
        end

        private

        attr_reader :action

        # ORD attributes in order of ORD definition by convention (they are numbered).
        def description
          workup['description']
        end

        def position
          action.position + 1
        end

        def start_time(starts_at)
          OrdKit::Time.new(
            value: starts_at.to_i / 1000,
            precision: nil,
            units: OrdKit::Time::TimeUnit::SECOND,
          )
        end

        def duration
          # We deliver all Times in seconds per convention. However currently we store milliseconds.
          # (this is the finest granularity, milliseconds not available in ORD). cbuggle, 6.1.2022
          OrdKit::Time.new(
            value: workup['duration'].to_i / 1000,
            precision: nil,
            units: OrdKit::Time::TimeUnit::SECOND,
          )
        end

        def equipment
          return unless workup['equipment']

          workup['equipment'].map do |equipment|
            OrdKit::Equipment.new(
              type: equipment_type(equipment),
              details: '', # Currently n/a in ELN.
            )
          end
        end

        def equipment_type(equipment)
          OrdKit::Equipment::EquipmentType.const_get(equipment)
        rescue NameError
          OrdKit::Equipment::EquipmentType::UNSPECIFIED
        end

        def action_type_attributes
          raise 'OrdKit::Exporter::Actions::Base is abstract. Please subclass and provide an implementation.'
        end
      end
    end
  end
end

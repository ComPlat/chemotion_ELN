# frozen_string_literal: true

# Sample Structure
class OSample < OpenStruct
  def initialize(data)
    # set nested attributes

    %w[residues elemental_compositions].each do |prop|
      prop_value = data.delete(prop) || []

      prop_value.each { |i| i.delete :id }

      next if prop_value.blank?

      data.merge!(
        "#{prop}_attributes" => prop_value,
      )
    end

    if data['elemental_compositions_attributes']
      data['elemental_compositions_attributes'].each do |i|
        i.delete('description')
      end
    end
    data['show_label'] = false if data['show_label'].blank?
    super
  end

  def is_new
    to_boolean super
  end

  def is_split
    to_boolean super
  end

  def to_boolean(string)
    !!"#{string}".match(/^(true|t|yes|y|1)$/i)
  end
end

module Usecases
  module Reactions
    class UpdateMaterials
      include ContainerHelpers
      include Reactable
      attr_reader :current_user

      def initialize(reaction, materials, user, vessel_size)
        @reaction = reaction
        @materials = {
          starting_material: Array(materials['starting_materials']).map { |m| OSample.new(m) },
          intermediate: Array(materials['intermediate_samples']).map { |m| OSample.new(m) },
          reactant: Array(materials['reactants']).map { |m| OSample.new(m) },
          solvent: Array(materials['solvents']).map { |m| OSample.new(m) },
          purification_solvent: Array(materials['purification_solvents']).map { |m| OSample.new(m) },
          product: Array(materials['products']).map { |m| OSample.new(m) },
        }
        @current_user = user
        @vessel_size = vessel_size
      end

      def execute!
        weight_percentage_ref_record_target_amount = nil
        if @reaction.weight_percentage
          # find the actual target amount and unit of weight percentage reference record
          @materials.each_value do |samples|
            samples.each do |sample|
              next unless sample.weight_percentage_reference

              weight_percentage_ref_record_target_amount = {
                value: sample.target_amount_value,
                unit: sample.target_amount_unit,
              }
              break
            end
            break if weight_percentage_ref_record_target_amount
          end
        end
        ActiveRecord::Base.transaction do
          modified_sample_ids = []
          @materials.each do |material_group, samples|
            material_group = material_group.to_s
            fixed_label = material_group if %w[reactant solvent].include?(material_group)
            samples.each_with_index do |sample, idx|
              sample.position = idx if sample.position.nil?
              sample.reference = false if material_group == 'solvent' && sample.reference == true
              if sample.is_new
                if sample.parent_id && material_group != 'product'
                  modified_sample = create_sub_sample(
                    sample,
                    fixed_label,
                    weight_percentage_ref_record_target_amount,
                  )
                else
                  modified_sample = create_new_sample(sample, fixed_label, weight_percentage_ref_record_target_amount)
                end
              else
                modified_sample = update_existing_sample(
                  sample,
                  fixed_label,
                  weight_percentage_ref_record_target_amount,
                )
              end

              if sample.components.present? && sample.sample_type == Sample::SAMPLE_TYPE_MIXTURE
                Usecases::Components::Create.new(modified_sample, sample.components).execute!
              end

              if sample.segments
                modified_sample.save_segments(segments: sample.segments,
                                              current_user_id: @current_user.id)
              end
              modified_sample_ids << modified_sample.id

              associate_sample_with_reaction(sample, modified_sample, material_group)
            end
          end
          destroy_unused_samples(modified_sample_ids)
        end
        @reaction.reload
        @reaction.save! # to update the SVG
        @reaction
      end

      private

      def create_sub_sample(sample, fixed_label, target_amount = nil)
        parent_sample = Sample.find(sample.parent_id)

        subsample = parent_sample.create_subsample(@current_user, @reaction.collections, true, 'reaction')
        subsample.short_label = fixed_label if fixed_label

        if @reaction.weight_percentage && sample.weight_percentage.present? &&
           sample.weight_percentage.to_f.positive? && !sample.weight_percentage_reference
          assign_weight_percentage_amounts(subsample, target_amount, sample.weight_percentage)
        else
          subsample.target_amount_value = sample.target_amount_value
          subsample.target_amount_unit = sample.target_amount_unit
          subsample.real_amount_value = sample.real_amount_value
          subsample.real_amount_unit = sample.real_amount_unit
        end
        subsample.metrics = sample.metrics
        subsample.dry_solvent = sample.dry_solvent
        # add new data container
        subsample.container = update_datamodel(sample.container) if sample.container

        subsample.save!
        subsample.reload
        subsample
      end

      def create_new_sample(sample, fixed_label, target_amount = nil)
        attributes = sample.to_h.except(
          :id, :is_new, :is_split, :reference, :equivalent, :position,
          :type, :molecule, :collection_id, :short_label, :waste, :show_label, :coefficient, :user_labels,
          :boiling_point_lowerbound, :boiling_point_upperbound,
          :melting_point_lowerbound, :melting_point_upperbound, :segments, :gas_type,
          :gas_phase_data, :conversion_rate, :weight_percentage_reference, :weight_percentage, :components,
          :literatures, :intermediate_type
        ).merge(created_by: @current_user.id,
                boiling_point: rangebound(sample.boiling_point_lowerbound, sample.boiling_point_upperbound),
                melting_point: rangebound(sample.melting_point_lowerbound, sample.melting_point_upperbound))

        # update attributes[:name] for a copied reaction
        if (@reaction.name || '').include?('Copy') && attributes[:name].present?
          named_by_reaction = "#{@reaction.short_label}"
          named_by_reaction += "-#{attributes[:name].split('-').last}"
          attributes.merge!(name: named_by_reaction)
        end

        container_info = attributes[:container]
        attributes.delete(:container)
        attributes.delete(:segments)
        new_sample = Sample.new(attributes)
        if @reaction.weight_percentage && sample.weight_percentage.present? &&
           sample.weight_percentage.to_f.positive? && !sample.weight_percentage_reference
          assign_weight_percentage_amounts(new_sample, target_amount, sample.weight_percentage)
        end

        new_sample.short_label = fixed_label if fixed_label
        new_sample.xref['inventory_label'] = nil if new_sample.xref['inventory_label']
        new_sample.skip_inventory_label_update = true

        # add new data container
        new_sample.container = update_datamodel(container_info)

        new_sample.collections << @reaction.collections
        new_sample.save!
        new_sample
      end

      def update_mole_gas_product(sample, vessel_volume)
        gas_phase_data = sample.gas_phase_data

        calculate_mole_gas_product(
          gas_phase_data['part_per_million'],
          gas_phase_data['temperature'],
          vessel_volume,
        )
      end

      def set_mole_value_gas_product(existing_sample, sample)
        vessel_volume = reaction_vessel_volume(@reaction.vessel_size)
        return nil if vessel_volume.nil?

        real_amount_unset = sample.real_amount_value.nil? || sample.real_amount_value.zero?
        if real_amount_unset && sample.target_amount_value && !sample.target_amount_value.zero?
          existing_sample.target_amount_value = update_mole_gas_product(sample, vessel_volume)
          existing_sample.target_amount_unit = 'mol'
        else
          existing_sample.real_amount_value = update_mole_gas_product(sample, vessel_volume)
          existing_sample.real_amount_unit = 'mol'
        end
      end

      def update_existing_sample(sample, fixed_label, target_amount = nil)
        existing_sample = Sample.find(sample.id)

        update_gas_material = @reaction.vessel_size && @vessel_size && (
          @reaction.vessel_size['amount'] != @vessel_size['amount'] ||
          @reaction.vessel_size['unit'] != @vessel_size['unit']
        )
        if sample.gas_type == 'gas' && update_gas_material
          set_mole_value_gas_product(existing_sample, sample)
        elsif @reaction.weight_percentage && sample.weight_percentage.present? &&
              sample.weight_percentage.to_f.positive? && !sample.weight_percentage_reference
          assign_weight_percentage_amounts(existing_sample, target_amount, sample.weight_percentage)
        else
          existing_sample.target_amount_value = sample.target_amount_value
          existing_sample.target_amount_unit = sample.target_amount_unit
          existing_sample.real_amount_value = sample.real_amount_value
          existing_sample.real_amount_unit = sample.real_amount_unit
        end
        existing_sample.metrics = sample.metrics
        existing_sample.external_label = sample.external_label if sample.external_label
        existing_sample.short_label = sample.short_label if sample.short_label
        existing_sample.short_label = fixed_label if fixed_label
        existing_sample.name = sample.name if sample.name
        existing_sample.dry_solvent = sample.dry_solvent
        # Handle components for mixture samples using the proper use case
        if sample.sample_type == Sample::SAMPLE_TYPE_MIXTURE && sample.components.present?
          Usecases::Components::Create.new(existing_sample, sample.components).execute!
        end
        existing_sample.solvent = sample.solvent

        if r = existing_sample.residues[0]
          r.assign_attributes sample.residues_attributes[0]
        end

        existing_sample.container = update_datamodel(sample.container) if sample.container

        existing_sample.skip_reaction_svg_update = true
        existing_sample.save!
        existing_sample
      end

      def associate_sample_with_reaction(sample, modified_sample, material_group)
        reactions_sample_klass = "Reactions#{material_group.camelize}Sample"
        existing_association = ReactionsSample.find_by(sample_id: modified_sample.id)
        weight_percentage = sample.weight_percentage_reference ? 1 : sample.weight_percentage
        if existing_association
          existing_association.update!(
            reaction_id: @reaction.id,
            #equivalent: sample.equivalent,
            reference: sample.reference,
            show_label: sample.show_label,
            waste: sample.waste,
            coefficient: sample.coefficient,
            position: sample.position,
            type: reactions_sample_klass,
            gas_type: sample.gas_type,
            gas_phase_data: sample.gas_phase_data,
            conversion_rate: sample.conversion_rate,
            weight_percentage_reference: sample.weight_percentage_reference,
            weight_percentage: weight_percentage,
          )
        # sample was moved to other materialgroup
        else
          ReactionsSample.create!(
            sample_id: modified_sample.id,
            reaction_id: @reaction.id,
            #equivalent: sample.equivalent,
            reference: sample.reference,
            show_label: sample.show_label,
            waste: sample.waste,
            coefficient: sample.coefficient,
            position: sample.position,
            type: reactions_sample_klass,
            gas_type: sample.gas_type,
            gas_phase_data: sample.gas_phase_data,
            conversion_rate: sample.conversion_rate,
            weight_percentage_reference: sample.weight_percentage_reference,
            weight_percentage: weight_percentage,
          )
        end
      end

      def destroy_unused_samples(modified_sample_ids)
        current_sample_ids = @reaction.reactions_samples.pluck(:sample_id)
        sample_ids_to_delete = current_sample_ids - modified_sample_ids
        Sample.where(id: sample_ids_to_delete).destroy_all
      end

      def rangebound(lower, upper)
        lower = lower.blank? ? -Float::INFINITY : BigDecimal(lower.to_s)
        upper = upper.blank? ? Float::INFINITY : BigDecimal(upper.to_s)
        if lower == -Float::INFINITY && upper == Float::INFINITY
          Range.new(-Float::INFINITY, Float::INFINITY, '()')
        else
          Range.new(lower, upper)
        end
      end


      # Find the reaction-level ReactionsSample marked as the weight-percentage
      # reference.
      #
      # @return [ReactionsSample, nil]
      def find_weight_percentage_reference_record
        ReactionsSample.where(reaction_id: @reaction.id, weight_percentage_reference: true).first
      end

      # Return true when update should be skipped because the weight percentage is missing/zero.
      #
      # @return [Boolean]
      def skip_weight_percentage_update?(material)
        material.weight_percentage.nil? || material.weight_percentage.zero?
      end

      # Apply the reference's target amount multiplied by the local weight
      # percentage to the appropriate amount field (target or real) on this
      # ReactionsSample.
      #
      # @param ref_target_amount_value [Numeric], weight percentage [Numeric]
      # @return [void]
      def apply_weight_percentage(ref_target_amount_value, weight_percentage)
        return if ref_target_amount_value.nil? || weight_percentage.nil?

        ref_target_amount_value * weight_percentage
      end

      # Assign weight-percentage-derived amounts and units to the provided
      # sample record and return it.
      #
      # @param target_sample [Sample] The ActiveRecord sample to update
      # @return [Sample]
      def assign_weight_percentage_amounts(sample, target_amount = nil, weight_percentage = nil)
        return if target_amount.nil? || weight_percentage.nil?

        calculated_value = apply_weight_percentage(target_amount[:value], weight_percentage)
        # When the reaction uses the weight-percentage scheme, the sample's
        # amounts (both target and real) cannot be independently input — they are
        # computed as a fraction of the reaction-level amount of weight percentage
        # reference material. Therefore we assign the same calculated
        # value to both `target_amount_value` and `real_amount_value`, and copy
        # the corresponding units from the reference sample so the record is
        # internally consistent using backend logic and UI reaction scheme display logic.
        unless calculated_value.nil?
          sample.target_amount_value = calculated_value
          # Use the target amount unit from the weight percentage reference material
          sample.target_amount_unit = target_amount[:unit]
          sample.real_amount_value = calculated_value
          sample.real_amount_unit = target_amount[:unit]
        end

        sample
      end
    end
  end
end

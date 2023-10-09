# frozen_string_literal: true

# Sample Structure
class OSample < OpenStruct
  def initialize(data)
    # set nested attributes

    %w[residues elemental_compositions].each do |prop|
      prop_value = data.delete(prop) || []

      prop_value.each { |i| i.delete :id }

      data.merge!(
        "#{prop}_attributes" => prop_value
      ) unless prop_value.blank?
    end

    data['elemental_compositions_attributes'].each { |i| i.delete('description') } if data['elemental_compositions_attributes']
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
      attr_reader :current_user

      def initialize(reaction, materials, user)
        @reaction = reaction
        @materials = {
          starting_material: Array(materials['starting_materials']).map { |m| OSample.new(m) },
          reactant: Array(materials['reactants']).map { |m| OSample.new(m) },
          solvent: Array(materials['solvents']).map { |m| OSample.new(m) },
          purification_solvent: Array(materials['purification_solvents']).map { |m| OSample.new(m) },
          product: Array(materials['products']).map { |m| OSample.new(m) }
        }
        @current_user = user
      end

      def execute!
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
                  modified_sample = create_sub_sample(sample, fixed_label)
                else
                  modified_sample = create_new_sample(sample, fixed_label)
                end
              else
                modified_sample = update_existing_sample(sample, fixed_label)
              end

              modified_sample.save_segments(segments: sample.segments, current_user_id: @current_user.id) if sample.segments
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

      def create_sub_sample(sample, fixed_label)
        parent_sample = Sample.find(sample.parent_id)

        subsample = parent_sample.create_subsample(@current_user, @reaction.collections, true, 'reaction')
        subsample.short_label = fixed_label if fixed_label

        subsample.target_amount_value = sample.target_amount_value
        subsample.target_amount_unit = sample.target_amount_unit
        subsample.real_amount_value = sample.real_amount_value
        subsample.real_amount_unit = sample.real_amount_unit
        subsample.metrics = sample.metrics
        subsample.dry_solvent = sample.dry_solvent

        # add new data container
        subsample.container = update_datamodel(sample.container) if sample.container

        subsample.save!
        subsample.reload
        subsample
      end

      def create_new_sample(sample, fixed_label)
        attributes = sample.to_h.except(
          :id, :is_new, :is_split, :reference, :equivalent, :position,
          :type, :molecule, :collection_id, :short_label, :waste, :show_label, :coefficient, :user_labels,
          :boiling_point_lowerbound, :boiling_point_upperbound,
          :melting_point_lowerbound, :melting_point_upperbound, :segments
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
        new_sample = Sample.new(
          attributes
        )

        new_sample.short_label = fixed_label if fixed_label

        # add new data container
        new_sample.container = update_datamodel(container_info)

        new_sample.collections << @reaction.collections

        new_sample.save!
        new_sample
      end

      def update_existing_sample(sample, fixed_label)
        existing_sample = Sample.find(sample.id)

        existing_sample.target_amount_value = sample.target_amount_value
        existing_sample.target_amount_unit = sample.target_amount_unit
        existing_sample.real_amount_value = sample.real_amount_value
        existing_sample.real_amount_unit = sample.real_amount_unit
        existing_sample.metrics = sample.metrics
        existing_sample.external_label = sample.external_label if sample.external_label
        existing_sample.short_label = sample.short_label if sample.short_label
        existing_sample.short_label = fixed_label if fixed_label
        existing_sample.name = sample.name if sample.name
        existing_sample.dry_solvent = sample.dry_solvent

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
        if existing_association
          existing_association.update!(
            reaction_id: @reaction.id,
            equivalent: sample.equivalent,
            reference: sample.reference,
            show_label: sample.show_label,
            waste: sample.waste,
            coefficient: sample.coefficient,
            position: sample.position,
            type: reactions_sample_klass
          )
        # sample was moved to other materialgroup
        else
          ReactionsSample.create!(
            sample_id: modified_sample.id,
            reaction_id: @reaction.id,
            equivalent: sample.equivalent,
            reference: sample.reference,
            show_label: sample.show_label,
            waste: sample.waste,
            coefficient: sample.coefficient,
            position: sample.position,
            type: reactions_sample_klass
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
    end
  end
end

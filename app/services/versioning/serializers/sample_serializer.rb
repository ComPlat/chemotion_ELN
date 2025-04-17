# frozen_string_literal: true

# rubocop:disable Metrics/MethodLength

module Versioning
  module Serializers
    class SampleSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name = ['Properties'])
        new(record: record, name: name).call
      end

      def field_definitions
        {
          created_at: {
            label: 'Created at',
            kind: :date,
          },
          name: {
            label: 'Name',
            revert: %i[name],
          },
          description: {
            label: 'Description',
            revert: %i[description],
          },
          created_by: {
            label: 'Created by',
            formatter: user_formatter,
          },
          sample_svg_file: {
            label: 'Structure',
            kind: :image,
            formatter: svg_path_formatter('samples'),
            revertible_value_formatter: default_formatter,
            revert: %i[sample_svg_file molfile molecule_id fingerprint_id],
          },
          stereo: [
            {
              name: 'stereo.abs',
              label: 'Stereo Abs',
              formatter: jsonb_formatter('abs'),
              revert: %i[stereo.abs],
            },
            {
              name: 'stereo.rel',
              label: 'Stereo Rel',
              formatter: jsonb_formatter('rel'),
              revert: %i[stereo.rel],
            },
          ],
          is_top_secret: {
            label: 'Top secret',
            kind: :boolean,
            revert: %i[is_top_secret],
          },
          external_label: {
            label: 'External label',
            revert: %i[external_label],
          },
          boiling_point: {
            label: 'Boiling point',
            kind: :numrange,
            revert: %i[boiling_point],
            formatter: non_formatter,
          },
          melting_point: {
            label: 'Melting point',
            kind: :numrange,
            revert: %i[melting_point],
            formatter: non_formatter,
          },
          purity: {
            label: 'Purity/Concentration',
            revert: %i[purity density],
          },
          density: {
            label: 'Density',
            revert: %i[density purity],
          },
          molarity_value: {
            label: 'Molarity',
            revert: %i[molarity_value],
          },
          target_amount_value: {
            label: 'Amount',
            revert: %i[target_amount_value target_amount_unit],
          },
          target_amount_unit: {
            label: 'Target amount unit',
            revert: %i[target_amount_unit target_amount_value],
          },
          location: {
            label: 'Location',
            revert: %i[location],
          },
          molfile: {
            label: 'Molfile',
          },
          metrics: {
            label: 'Amount metrics',
            revert: %i[metrics],
            formatter: metrics_formatter,
            revertible_value_formatter: default_formatter,
          },
          xref: [
            {
              name: 'xref.cas',
              label: 'CAS',
              revert: %i[xref.cas],
              formatter: jsonb_formatter('cas'),
            },
            {
              name: 'xref.inventory_label',
              label: 'Inventory label',
              revert: %i[xref.inventory_label],
              formatter: jsonb_formatter('inventory_label'),
            },
            {
              name: 'xref.flash_point',
              label: 'Flash Point',
              revert: %i[xref.flash_point],
              formatter: jsonb_formatter('flash_point', 'value'),
            },
            {
              name: 'xref.form',
              label: 'Form',
              revert: %i[xref.form],
              formatter: jsonb_formatter('form'),
            },
            {
              name: 'xref.color',
              label: 'Color',
              revert: %i[xref.color],
              formatter: jsonb_formatter('color'),
            },
            {
              name: 'xref.solubility',
              label: 'Solubility',
              revert: %i[xref.solubility],
              formatter: jsonb_formatter('solubility'),
            },
            {
              name: 'xref.refractive_index',
              label: 'Refractive Index',
              revert: %i[xref.refractive_index],
              formatter: jsonb_formatter('refractive_index'),
            },
          ],
          solvent: {
            label: 'Solvent',
            kind: :solvent,
            revert: %i[solvent],
          },
          molecule_name_id: {
            label: 'Molecule name',
            formatter: ->(_key, value) { molecule_names_lookup[value] },
            revert: %i[molecule_name_id],
            revertible_value_formatter: default_formatter,
          },
          molecule_id: {
            label: 'Molecule Inchikey',
            formatter: ->(_key, value) { get_molecule_inchikey[value] },
          },
          fingerprint_id: {
            kind: :hidden,
          },
        }.with_indifferent_access
      end

      private

      def molecule_names_lookup
        @molecule_names_lookup ||= begin
          ids = Set.new

          record.log_data.versions.each do |v|
            ids << v.changes['molecule_name_id'] if v.changes.key?('molecule_name_id')
          end

          MoleculeName.with_deleted.where(id: ids).to_h { |u| [u.id, u.name] }
        end
      end

      def get_molecule_inchikey
        @get_molecule_inchikey ||= begin
          ids = Set.new

          record.log_data.versions.each do |v|
            ids << v.changes['molecule_id'] if v.changes.key?('molecule_id')
          end

          Molecule.with_deleted.where(id: ids).to_h { |u| [u.id, "#{u.inchikey} (#{u.sum_formular})"] }
        end
      end

      def metrics_formatter
        lambda do |_key, value|
          return '' unless value

          first = {
            'm' => 'mg',
            'n' => 'g',
            'u' => 'μg',
          }[value[0]]

          second = {
            'm' => 'ml',
            'n' => 'l',
            'u' => 'μl',
          }[value[1]]

          third = {
            'm' => 'mmol',
            'n' => 'mol',
          }[value[2]]

          [first, second, third].join(', ')
        end
      end
    end
  end
end
# rubocop:enable Metrics/MethodLength

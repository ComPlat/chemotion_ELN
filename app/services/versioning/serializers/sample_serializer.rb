# frozen_string_literal: true

# rubocop:disable Metrics/MethodLength

module Versioning
  module Serializers
    class SampleSerializer < Versioning::Serializers::BaseSerializer
      def self.call(record, name = ['Sample Properties'])
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
            kind: :molFile,
          },
          metrics: {
            label: 'Amount metrics',
            revert: %i[metrics],
            formatter: metrics_formatter,
            revertible_value_formatter: default_formatter,
          },
          xref: xref_field_definitions,
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
          state: { label: 'State', revert: %i[state] },
          height: { label: 'Height', revert: %i[height] },
          width: { label: 'Width', revert: %i[width] },
          length: { label: 'Length', revert: %i[length] },
          diameter: { label: 'Diameter', revert: %i[diameter] },
          storage_condition: { label: 'Storage condition', revert: %i[storage_condition] },
          material: { label: 'Material', revert: %i[material] },
          cspi: { label: 'CSPI', revert: %i[cspi] },
          particle_size: { label: 'Particle size', revert: %i[particle_size] },
          shape: { label: 'Shape', revert: %i[shape] },
          sieve_fraction: { label: 'Sieve fraction', revert: %i[sieve_fraction] },
          layer_thickness: { label: 'Layer thickness', revert: %i[layer_thickness] },
          liquid_medium: { label: 'Liquid medium', revert: %i[liquid_medium] },
          stabilizer: { label: 'Stabilizer', revert: %i[stabilizer] },
        }.with_indifferent_access
      end

      private

      # Each xref entry follows the same shape: it reads/writes a single key under
      # the sample's jsonb `xref` column. flash_point is the only one that targets a
      # nested path ('value'), so the formatter path is passed through verbatim.
      def xref_field_definitions
        [
          xref_field('cas', 'CAS'),
          xref_field('inventory_label', 'Inventory label'),
          xref_field('flash_point', 'Flash Point', 'value'),
          xref_field('form', 'Form'),
          xref_field('color', 'Color'),
          xref_field('solubility', 'Solubility'),
          xref_field('refractive_index', 'Refractive Index'),
          xref_field('moisture', 'Moisture'),
          xref_field('particle_size', 'Particle size'),
          xref_field('physical_state', 'Physical state'),
        ]
      end

      def xref_field(key, label, *path)
        {
          name: "xref.#{key}",
          label: label,
          revert: [:"xref.#{key}"],
          formatter: jsonb_formatter(key, *path),
        }
      end

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

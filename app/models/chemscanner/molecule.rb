# frozen_string_literal: true

# == Schema Information
#
# Table name: chemscanner_molecules
#
#  id                :integer          not null, primary key
#  scheme_id         :integer          not null
#  external_id       :integer
#  clone_from        :integer
#  mdl               :string
#  cano_smiles       :string
#  label             :string
#  abbreviation      :string
#  description       :string
#  aliases           :jsonb
#  details           :jsonb
#  extended_metadata :jsonb
#  is_approved       :boolean          default(FALSE)
#  imported_id       :integer
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  deleted_at        :datetime
#  inchistring       :string
#  inchikey          :string
#

module Chemscanner
  # ChemScanner scanned molecule(s)
  class Molecule < ActiveRecord::Base
    acts_as_paranoid

    belongs_to :scheme, class_name: 'Scheme', foreign_key: :scheme_id

    has_many :reactions_molecules, dependent: :destroy
    has_many :reactions_reactant_molecules, dependent: :destroy
    has_many :reactions_reagent_molecules, dependent: :destroy
    has_many :reactions_product_molecules, dependent: :destroy

    has_many :reactions, through: :reactions_molecules
    has_many :reactions_as_reactant, through: :reactions_reactant_molecules, source: :reaction
    has_many :reactions_as_reagent, through: :reactions_reagnet_molecules, source: :reaction
    has_many :reactions_as_product, through: :reactions_product_molecules, source: :reaction

    # rubocop:disable AbcSize
    def assign_from_chemscanner(molecule)
      aliases = molecule.atom_map.each_with_object({}) do |(_, atom), hash|
        next hash unless atom.is_alias && !atom.alias_text.empty?

        hash[atom.get_idx] = atom.alias_text
      end

      inchi, inchikey = Chemotion::OpenBabelService.inchi_info_from_molfile(molecule.mdl)

      assign_attributes(
        external_id: molecule.id,
        mdl: molecule.mdl,
        cano_smiles: molecule.cano_smiles,
        clone_from: molecule.clone_from,
        abbreviation: molecule.abbreviation,
        inchistring: inchi,
        inchikey: inchikey,
        label: molecule.label,
        description: molecule.text,
        details: molecule.details.to_hash || {},
        aliases: aliases
      )
    end
    # rubocop:enable AbcSize

    def set_polymer(atom_idx)
      mdl_lines = mdl.split("\n")
      end_line_idx = mdl_lines.find_index { |l| l == 'M  END' }
      return false if end_line_idx.nil?

      ext_data = extended_metadata

      polymers = ext_data['polymer'] || []
      if polymers.include?(atom_idx)
        polymers.delete_if { |idx| idx == atom_idx }
      else
        polymers.push(atom_idx)
      end

      has_polymer = !polymers.empty?
      ext_data['polymer'] = polymers

      rgp_line_idx = mdl_lines.find_index { |l| l.match(/^M  RGP/) }
      mdl_lines.delete_at(rgp_line_idx) unless rgp_line_idx.nil?
      if has_polymer
        rgp_info = polymers.map { |idx| "#{idx + 1}   1" }.join('   ')
        rgp_line = "M  RGP  #{polymers.count}   #{rgp_info}"

        mdl_lines.insert(end_line_idx, rgp_line)
      end

      polymer_line_idx = mdl_lines.find_index { |l| l == '> <PolymersList>' }
      unless polymer_line_idx.nil?
        mdl_lines.delete_at(polymer_line_idx + 1)
        mdl_lines.delete_at(polymer_line_idx)
      end

      if has_polymer
        mdl_lines.insert(end_line_idx + 2, polymers.join(' '))
        mdl_lines.insert(end_line_idx + 2, '> <PolymersList>')
      end
      mdl_lines.push('$$$$') if mdl_lines.last.strip != '$$$$'

      update(extended_metadata: ext_data, mdl: mdl_lines.join("\n"))
    end
  end
end

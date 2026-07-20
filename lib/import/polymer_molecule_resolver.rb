# frozen_string_literal: true

require Rails.root.join('lib/chemotion/molfile_polymer_support')

module Import
  # Resolves (finds or creates) a Molecule from a molfile that contains a
  # "> <PolymersList>" (and/or "> <TextNode>") block: cleans the molfile for OpenBabel,
  # finds/creates by inchikey (falling back to a synthetic inchikey when OpenBabel can't
  # derive one for the polymer structure), then reprocesses+reattaches the SVG using the
  # *full* (uncleaned) molfile so SvgRenderer's polymer-shape injection has the PolymersList
  # data available.
  #
  # Consolidates logic previously duplicated across Import::ImportSamples#get_data_from_molfile,
  # Import::ImportSdf#find_or_create_polymer_molfile_entry, Import::ImportSdf#molecule_and_molfile_for_row,
  # and Import::ImportCollections#find_or_create_molecule_for_polymer_molfile.
  class PolymerMoleculeResolver
    Result = Struct.new(:molecule, :raw_molfile, :babel_info, keyword_init: true)

    # @param raw_molfile [String] the full molfile, including the PolymersList/TextNode blocks
    # @param lcss_batch [Array<Integer>, nil] forwarded to Molecule.find_or_create_by_molfile /
    #   the synthetic-inchikey fallback, same semantics as elsewhere in the importers
    # @param unescape_octal [Boolean] whether to run unescape_textnode_octal_in_molfile first
    #   (true for xlsx/SDF-sourced molfiles that can have Excel octal-escaping; false for
    #   export.json-sourced molfiles, which don't have this problem -- see Import::ImportCollections)
    # @return [Result] molecule may be nil if the cleaned molfile was blank
    def self.call(raw_molfile, lcss_batch: nil, unescape_octal: true)
      new(raw_molfile, lcss_batch: lcss_batch, unescape_octal: unescape_octal).call
    end

    def initialize(raw_molfile, lcss_batch:, unescape_octal:)
      @raw_molfile = raw_molfile
      @lcss_batch = lcss_batch
      @unescape_octal = unescape_octal
    end

    def call
      raw = @unescape_octal ? unescape_textnode_octal_in_molfile(@raw_molfile) : @raw_molfile.to_s
      cleaned = Chemotion::MolfilePolymerSupport.clean_molfile_for_inchikey(raw)
      return Result.new(molecule: nil, raw_molfile: raw, babel_info: nil) if cleaned.blank?

      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(pad(cleaned))
      molecule = if babel_info[:inchikey].present?
                   Molecule.find_or_create_by_molfile(raw, lcss_batch: @lcss_batch, **babel_info)
                 else
                   find_or_create_polymer_molecule_without_inchikey(raw, babel_info, lcss_batch: @lcss_batch)
                 end
      reattach_svg_if_present(molecule, raw) if molecule.present?

      Result.new(molecule: molecule, raw_molfile: raw, babel_info: babel_info)
    end

    private

    def pad(molfile)
      m = molfile.dup
      m = "\n#{m}" unless m.start_with?("\n")
      m.end_with?("\n") ? m : "#{m}\n"
    end

    def reattach_svg_if_present(molecule, raw)
      reprocessed_svg = Molecule.svg_reprocess(nil, raw, service: :indigo)
      return if reprocessed_svg.blank?

      molecule.attach_svg(reprocessed_svg)
      molecule.molfile = raw if molecule.molfile.to_s != raw
      molecule.save
    end

    # When Open Babel returns blank inchikey for a PolymersList molfile, create a molecule with a
    # synthetic inchikey so we can store the full molfile; SVG is generated separately via svg_reprocess.
    # Moved here (was byte-identical, copy-pasted between Import::ImportSamples and Import::ImportCollections).
    def find_or_create_polymer_molecule_without_inchikey(raw_molfile, babel_info, lcss_batch: nil)
      synthetic_inchikey = "POLYMER_#{Digest::SHA256.hexdigest(raw_molfile)}"
      formula = babel_info[:formula].to_s.presence || ''
      molecule = Molecule.find_by(inchikey: synthetic_inchikey, is_partial: true, sum_formular: formula)
      is_new = molecule.nil?
      if molecule
        molecule.molfile = raw_molfile
      else
        molecule = Molecule.new(
          inchikey: synthetic_inchikey,
          is_partial: true,
          sum_formular: formula,
          molfile: raw_molfile,
        )
      end
      molecule.skip_lcss_callback = true if is_new && lcss_batch
      molecule.save!
      lcss_batch << molecule.id if is_new && lcss_batch
      molecule
    end

    # Moved here from Import::ImportSamples (was not already in the shared MolfilePolymerSupport module).
    def unescape_textnode_octal_in_molfile(molfile)
      return molfile if molfile.blank?

      molfile = molfile.to_s
      return molfile unless molfile.include?('> <TextNode>')

      molfile.gsub(%r{> <TextNode>\s*([\s\S]*?)\s*> </TextNode>}i) do
        content = Regexp.last_match(1)
        converted = content.gsub(/(?:\\[0-7]{1,3})+/) do |seq|
          bytes = seq.scan(/\\([0-7]{1,3})/).flatten.map { |o| o.to_i(8) }
          bytes.pack('C*').force_encoding('UTF-8')
        end
        "> <TextNode>\n#{converted}\n> </TextNode>"
      end
    end
  end
end

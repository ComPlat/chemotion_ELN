# frozen_string_literal: true

# Helpers function for CDX parser
module ChemScannerHelpers
  require 'base64'
  require 'open3'

  extend Grape::API::Helpers

  def read_docx(path, get_mol)
    docx = ChemScanner::Docx.new
    docx.read(path)

    info_arr = []
    docx.cdx_map.each_value do |info|
      cdx = info[:cdx]
      cdx_info = info_from_parser(cdx, get_mol)
      img_b64 = info[:img_b64]
      img_ext = info[:img_ext]

      info = { info: cdx_info, cdUid: SecureRandom.hex(10) }
      if img_ext == '.png'
        info[:svg] = "data:image/png;base64,#{img_b64}"
      elsif %w[.emf .wmf].include?(img_ext)
        info[:svg] = b64metafile_to_svg(img_b64, img_ext)
      end

      info_arr.push(info)
    end

    { cds: info_arr }
  end

  def read_doc(path, get_mol)
    doc = ChemScanner::Doc.new
    doc.read(path)

    info_arr = []
    doc.cdx_map.each_value do |cdx|
      cdx_info = info_from_parser(cdx, get_mol)
      info_arr.push(
        b64cdx: Base64.encode64(cdx.raw_data),
        info: cdx_info,
        cdUid: SecureRandom.hex(10)
      )
    end

    { cds: info_arr }
  end

  def read_cdx(path, get_mol)
    cdx = ChemScanner::Cdx.new
    cdx.read(path)

    {
      cds: [
        {
          b64cdx: Base64.encode64(cdx.raw_data),
          info: info_from_parser(cdx, get_mol),
          cdUid: SecureRandom.hex(10)
        }
      ]
    }
  end

  def read_cdxml(path, get_mol)
    cdxml = ChemScanner::Cdxml.new
    cdxml.read(path)

    {
      cds: [
        {
          cdxml: cdxml.raw_data,
          info: info_from_parser(cdxml, get_mol),
          cdUid: SecureRandom.hex(10)
        }
      ]
    }
  end

  def read_xml(path, get_mol)
    eln = ChemScanner::PerkinEln.new
    eln.read(path)

    info_arr = []
    eln.scheme_list.each do |scheme|
      info = info_from_parser(scheme, get_mol)
      info_arr.push(
        cdxml: scheme.cdxml,
        info: info,
        cdUid: SecureRandom.hex(10)
      )
    end

    { cds: info_arr }
  end

  def info_from_parser(parser, get_mol)
    objs = get_mol ? parser.molecules : parser.reactions
    return [] if objs.empty?

    infos = []
    objs.each do |obj|
      info = extract_info(obj, get_mol)
      infos.push(info) unless info.empty?
    end

    infos
  end

  def read_uploaded_file(file, get_mol)
    filepath = file.to_path
    extn = File.extname(filepath).downcase
    func_name = "read_#{extn[1..-1]}".to_sym
    return {} unless respond_to?(func_name)

    # begin
      return send(func_name, filepath, get_mol)
    # rescue StandardError => e
    #   Rails.logger.error("Error while parsing: #{e}")
    #   return {}
    # end
  end

  def extract_info(obj, get_mol)
    get_mol ? mol_info(obj, true) : reaction_info(obj)
  end

  def reaction_info(reaction)
    return {} if reaction.reactants.count.zero? || reaction.products.count.zero?

    list_mol_info = ->(arr) { arr.map { |m| mol_info(m) } }

    {
      id: reaction.arrow_id,
      svg: build_reaction_svg(reaction),
      smi: reaction.reaction_smiles,
      description: reaction.description,
      details: reaction.details.to_h || {},
      status: reaction.status,
      temperature: reaction.temperature,
      time: reaction.time,
      yield: reaction.yield,
      abbreviations: abbreviation_mdl(reaction.reagent_smiles),
      reactants: list_mol_info.call(reaction.reactants),
      reagents: list_mol_info.call(reaction.reagents),
      products: list_mol_info.call(reaction.products)
    }
  end

  def abbreviation_mdl(abbs)
    abbs.map { |s|
      {
        smi: s,
        mdl: Chemotion::OpenBabelService.molfile_from_cano_smiles(s)
      }
    }
  end

  def build_reaction_svg(reaction)
    mdl_info = {
      reactants_mdl: reaction.reactants.map(&:mdl),
      reagents_mdl: reaction.reagents.map(&:mdl),
      reagents_smiles: reaction.reagent_smiles,
      products_mdl: reaction.products.map(&:mdl)
    }

    SVG::ReactionComposer.cs_reaction_svg_from_mdl(
      mdl_info,
      ChemScanner.solvents.values
    )
  end

  def mol_info(mol, getSvg = false)
    return {} if mol.nil?

    alias_info = (mol.atom_map || {}).each_with_object([]) do |(key, atom), arr|
      next unless atom.is_alias || !atom.alias_text.empty?

      arr.push(id: key, text: atom.alias_text)
    end

    res = {
      id: mol.id,
      description: mol.text || '',
      details: mol.details.to_h || {},
      smi: mol.cano_smiles || '',
      mdl: mol.mdl,
      label: mol.label,
      alias: alias_info || []
    }

    res[:svg] = Chemotion::OpenBabelService.mdl_to_trans_svg(mol.mdl) if getSvg

    res
  end

  def b64metafile_to_svg(b64emf, extn)
    emf_file = Tempfile.new(['chemscanner', extn])
    svg_file = Tempfile.new(['chemscanner', '.svg'])
    IO.binwrite(emf_file.path, Base64.decode64(b64emf))

    emf_file.close
    svg_file.close

    cmd = "inkscape -l #{svg_file.path} #{emf_file.path}"
    Open3.popen3(cmd) do |_, _, _, wait_thr| wait_thr.value end

    svg = File.read(svg_file.path)

    emf_file.unlink
    svg_file.unlink

    svg
  end
end

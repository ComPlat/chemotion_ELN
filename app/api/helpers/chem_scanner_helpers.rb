# frozen_string_literal: true

# Helpers function for CDX parser
module ChemScannerHelpers
  require 'base64'

  extend Grape::API::Helpers

  def read_docx(path, get_mol)
    docx = ChemScanner::Docx.new
    docx.read(path)

    info_arr = []
    docx.cdx_map.each_value do |cdx|
      cdx_info = info_from_parser(cdx, get_mol)
      info_arr.push(
        b64cdx: Base64.encode64(cdx.raw_data),
        info: cdx_info
      )
    end

    {
      cds: info_arr
    }
  end

  def read_doc(path, get_mol)
    doc = ChemScanner::Doc.new
    doc.read(path)

    info_arr = []
    doc.cdx_map.each_value do |cdx|
      cdx_info = info_from_parser(cdx, get_mol)
      info_arr.push(
        b64cdx: Base64.encode64(cdx.raw_data),
        info: cdx_info
      )
    end

    {
      cds: info_arr
    }
  end

  def read_cdx(path, get_mol)
    cdx = ChemScanner::Cdx.new
    cdx.read(path)

    {
      cds: [
        {
          b64cdx: Base64.encode64(cdx.raw_data),
          info: info_from_parser(cdx, get_mol)
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
          info: info_from_parser(cdxml, get_mol)
        }
      ]
    }
  end

  def read_perkin_eln(path, get_mol)
    eln = ChemScanner::PerkinEln.new
    eln.read(path)

    info_arr = []
    eln.scheme_list.each do |scheme|
      info = info_from_parser(scheme, get_mol)
      info_arr.push(
        cdxml: scheme.cdxml,
        info: info
      )
    end

    {
      cds: info_arr
    }
  end

  def info_from_parser(parser, get_mol)
    objs = get_mol ? parser.molecules : parser.reactions
    return [] if objs.empty?

    infos = []
    objs.each do |obj|
      info = extract_info(obj, get_mol)
      infos.push(info) unless info.nil?
    end

    infos
  end

  def read_uploaded_file(file, get_mol)
    filepath = file.to_path
    extn = File.extname(filepath).downcase

    begin
      return case extn
             when '.docx' then read_docx(filepath, get_mol)
             when '.doc' then read_doc(filepath, get_mol)
             when '.cdx' then read_cdx(filepath, get_mol)
             when '.xml' then read_perkin_eln(filepath, get_mol)
             when '.cdxml' then read_cdxml(filepath, get_mol)
             else raise 'Uploaded file type is not supported'
             end
    rescue StandardError => e
      Rails.logger.error("Error while parsing: #{e}")
      return {}
    end
  end

  def extract_info(obj, get_mol)
    info = get_mol ? mol_info(obj) : reaction_info(obj)
    return if info.nil?

    svg = if get_mol
            Chemotion::OpenBabelService.mdl_to_trans_svg(info[:mdl])
          else
            SVG::ReactionComposer.cr_reaction_svg_from_mdl(
              info,
              ChemScanner.solvents.values
            )
          end

    info.merge(svg: svg)
  end

  def reaction_info(reaction)
    return nil if reaction.reactants.count.zero? || reaction.products.count.zero?

    desc = {}
    rdetails = reaction.details.to_h
    %w[reactants reagents products].each do |group|
      rgroup = reaction.send(group)
      rgroup.each_with_index do |mol, idx|
        mlabel = group.chomp('s') + " #{idx + 1}"
        desc[mlabel] = {
          text: mol.text.strip,
          label: mol.label.strip,
          mdl: mol.mdl
        }

        rdetails[mlabel] = mol.details.to_h
      end
    end
    desc[:reaction] = {
      description: reaction.description,
      status: reaction.status,
      temperature: reaction.temperature,
      time: reaction.time,
      yield: reaction.yield
    }

    reagents_mdl = []
    reagents_smiles = []

    reaction.reagents.each do |reagent|
      cano_smiles = reagent.cano_smiles
      mdl = reagent.mdl

      reagents_mdl.push(mdl)
      reagents_smiles.push(cano_smiles)
    end

    reaction.reagent_smiles.each do |smi|
      reagents_smiles.push(smi)
    end

    {
      smi: reaction.reaction_smiles,
      reactants_smiles: reaction.reactants.map(&:cano_smiles),
      reactants_mdl: reaction.reactants.map(&:mdl),
      reagents_smiles: reagents_smiles,
      reagents_mdl: reagents_mdl,
      products_smiles: reaction.products.map(&:cano_smiles),
      products_mdl: reaction.products.map(&:mdl),
      description: desc,
      details: rdetails
    }
  end

  def mol_info(mol)
    return if mol.nil?

    res = {
      description: mol.text,
      details: mol.details.to_h,
      smi: mol.cano_smiles,
      mdl: mol.mdl
    }

    res
  end
end

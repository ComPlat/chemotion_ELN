# frozen_string_literal: true

# Helpers function for CDX parser
module ChemReadHelpers
  extend Grape::API::Helpers
  include ChemReadTextHelpers

  reagents_paths = Dir.glob('lib/cdx/below_arrow/*.yaml')
                      .reject { |f| f.end_with?('solvents.yaml') }
                      .map { |f| Rails.root + f }
  REAGENTS_SMI = reagents_paths.reduce([]) { |acc, val|
    acc.concat(YAML.safe_load(File.open(val)).values)
  }

  solvents_path = Rails.root + 'lib/cdx/below_arrow/solvents.yaml'
  SOLVENTS_SMI = YAML.safe_load(File.open(solvents_path)).values

  def read_docx(path, dir, get_mol)
    Open3.popen3("unzip #{path} -d #{dir}") do |_, _, _, wait_thr|
      wait_thr.value
    end

    cmd = "for file in #{dir}/word/embeddings/*.bin; "
    cmd += 'do DIR="${file%.*}"; mkdir $DIR; 7z x -o$DIR/ $file; '
    cmd += 'mv $DIR/CONTENTS $DIR.cdx; done'
    Open3.popen3(cmd) do |_, _, _, wait_thr| wait_thr.value end

    # sort by order of cdx within docx
    cdx_files = Dir["#{dir}/word/embeddings/*.cdx"]&.sort { |x, y|
      File.basename(x)[/\d+/].to_i <=> File.basename(y)[/\d+/].to_i
    }

    infos = []
    cdx_files.each do |cdx|
      info = read_cdx(cdx, get_mol)
      next if info.nil?
      infos = infos.concat(info)
    end

    infos
  end

  def read_doc(path, get_mol)
    ole = Ole::Storage.open(path).root['ObjectPool']
    cdx_arr = ole.children.map { |x| x['CONTENTS'] && x['CONTENTS'].read }.compact

    infos = []
    cdx_arr.each do |cdx|
      info = read_cdx(cdx, get_mol, false)
      next if info.nil?
      infos = infos.concat(info)
    end

    infos
  end

  def read_cdx(cdx, get_mol, is_path = true)
    parser = Cdx::Parser::CDXParser.new
    parser.read(cdx, is_path)

    info_from_parser(parser, get_mol)
  end

  def read_xml(path, get_mol)
    parser = Cdx::Parser::ExmlParser.new
    parser.read(path)

    info_from_parser(parser, get_mol)
  end

  def read_cdxml(path, get_mol)
    parser = Cdx::Parser::CdxmlParser.new
    parser.read(path)

    info_from_parser(parser, get_mol)
  end

  def info_from_parser(parser, get_mol)
    objs = get_mol ? parser.molmap.values : parser.reaction
    return [] if objs.empty?

    infos = []
    objs.each do |obj|
      info = extract_info(obj, get_mol)
      infos.push(info)
    end

    infos
  end

  def read_uploaded_file(file, dir, get_mol)
    filepath = file.to_path
    extn = File.extname(filepath)

    begin
      return case extn
             when '.docx' then read_docx(filepath, dir, get_mol)
             when '.doc' then read_doc(file, get_mol)
             when '.cdx' then read_cdx(file, get_mol)
             when '.xml' then read_xml(file, get_mol)
             when '.cdxml' then read_cdxml(file, get_mol)
             else raise 'Uploaded file type is not supported'
             end
    rescue StandardError => e
      Rails.logger.error("Error while parsing: #{e}")
    end
  end

  def refine_text(obj, group)
    t = obj[:text]
    return if t.nil? || t.empty?

    extract_text_info(obj)

    expand_abb(obj) if group == 'reagents'
  end

  def extract_info(obj, get_mol)
    info = get_mol ? mol_info(obj) : reaction_info(obj)
    return nil if info.nil? || info[:smi].nil? || info[:smi].empty?

    svg = if get_mol
            Chemotion::OpenBabelService.smi_to_trans_svg(info[:smi])
          else
            SVG::ReactionComposer.cr_reaction_svg_from_rsmi(
              info[:smi],
              SOLVENTS_SMI,
              REAGENTS_SMI
            )
          end

    info.merge(svg: svg)
  end

  def extract_molecules(react, group)
    return { smis: [], desc: {} } unless react[group.to_sym]

    smi_array = []
    desc = {}
    react[group.to_sym].each_with_index do |m, idx|
      smi_array << m[:smi] if m[:smi]
      if m[:text]
        # Scan the text, try to extract/parse it as a molecule if there are
        # any abbreviations in the list
        smis = refine_text(m, group)
        smi_array.concat(smis) unless smis.nil? || smis.empty?
      end

      desc[idx] = {
        text: m[:text],
        time: m[:time],
        detail: m[:detail],
        temperature: m[:temperature]
      }
      desc[idx][:yield] = m[:yield] if %w[products reagents].include?(group)
    end

    { smis: smi_array, desc: desc }
  end

  def reaction_info(reaction)
    smi_array = []
    desc = { detail: reaction[:detail] }

    %w[reactants reagents products].each do |group|
      info = extract_molecules(reaction, group)
      desc[group.to_sym] = info[:desc]
      smi_array << info[:smis].compact.reject(&:empty?).join('.')
    end

    rinfo = desc[:reagents]
    desc[:reagents] = {}
    rinfo.values.compact.each do |val|
      %w[text time yield temperature].each do |field|
        field_s = field.to_sym
        next if val[field_s].nil?
        desc[:reagents][field_s] = '' if desc[:reagents][field_s].nil?
        desc[:reagents][field_s] += ' ' + val[field_s]
        desc[:reagents][field_s].strip!
      end
    end

    %w[reactants products].each do |group|
      desc[group.to_sym].values.compact.each do |val|
        %w[time temperature].each do |field|
          field_s = field.to_sym
          next if val[field_s].nil?
          desc[:reagents][field_s] = '' if desc[:reagents][field_s].nil?
          desc[:reagents][field_s] += ' ' + val[field_s]
          desc[:reagents][field_s].strip!
          val[field_s] = nil
        end

        unless val[:yield].nil?
          desc[:reagents][:yield] = val[:yield]
          val[:yield] = nil
        end
      end
    end
    rinfo = desc[:reagents]
    desc[:reagents] = { '0': rinfo }

    { smi: smi_array.join('>'), desc: desc }
  end

  def mol_info(obj)
    return if obj[:mol].nil?

    smi = obj[:smi].nil? ? '' : obj[:smi]
    res = { smi: smi, desc: {} }

    extract_text_info(obj) unless obj[:text].nil?

    res[:desc] = {
      detail: obj[:detail],
      text: obj[:text],
      time: obj[:time],
      yield: obj[:yield],
      temperature: obj[:temperature]
    }

    res
  end
end

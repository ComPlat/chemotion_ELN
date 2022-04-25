# frozen_string_literal: true

# ChemScanner wrapper lib
module Chemscanner
  # Docx Wrapper for ChemScanner
  # Detect and assign CDX scheme with corresponding text paragraph
  class DocxProcess
    attr_reader :reactions, :molecules, :cdx_map

    def initialize
      @reactions = []
      @molecules = []
      @cdx_map = {}
    end

    def read(path)
      dir = Dir.mktmpdir
      Dir.mkdir "#{dir}/embeddings"

      cdx_infos = retrieve_cdx_info(path, dir)
      return false if cdx_infos.empty?

      extra_text = "Additional Information from document:\n"
      cdx_infos.each do |cdx_info|
        ole_path = cdx_info[:ole_path]
        ole_contents = Ole::Storage.new(ole_path).root['CONTENTS']
        next if ole_contents.nil?

        cdx_content = ole_contents.read
        next unless cdx_content[0, 8] == 'VjCD0100'

        cdx = ChemScanner::Cdx.new
        cdx.read(cdx_content, false)

        desc = cdx_info[:description]
        if cdx.reactions.count.zero?
          cdx.molecules.each { |m| m.text += "\n\n#{extra_text}#{desc}" }
        else
          cdx.reactions.each { |r| r.description += "\n\n#{extra_text}#{desc}" }
        end

        @molecules.concat(cdx.molecules)
        @reactions.concat(cdx.reactions)

        base_name = File.basename(ole_path, '.bin')
        @cdx_map[base_name] = {
          cdx: cdx,
          description: cdx_info[:description],
          img_ext: cdx_info[:img_ext],
          img_b64: cdx_info[:img_b64]
        }
      rescue RuntimeError
        next
      end

      FileUtils.remove_entry_secure dir

      true
    end

    private

    def read_from_zip(zip_file, path)
      content = zip_file.glob(path).first
      return nil if content.nil?

      content.get_input_stream.read
    end

    def xml_from_zip(zip_file, path)
      content = read_from_zip(zip_file, path)
      return nil if content.nil?

      Nokogiri::XML(content)
    end

    def retrieve_cdx_info(docx_file, dir)
      @zip_file = Zip::File.open(docx_file)
      @document_xml = xml_from_zip(@zip_file, 'word/document.xml')
      @list_para = @document_xml.xpath('//w:p')

      @condition = './/w:u |.//w:b | .//w:i'

      style_xml = xml_from_zip(@zip_file, 'word/styles.xml')
      styles = style_xml.xpath('//w:style').reject do |s|
        s.xpath(@condition).empty?
      end

      @style_ids = styles.map { |s| s.attr('w:styleId') }

      list_block = split_docx_to_block

      rels = xml_from_zip(@zip_file, 'word/_rels/document.xml.rels')
      doc = xml_from_zip(@zip_file, 'word/document.xml')

      return [] if rels.nil? || doc.nil?

      rels.remove_namespaces!

      cdx_infos = []
      list_block.each do |block|
        ole_list = []
        list_content = []

        block.each do |para_xml|
          ole = para_xml.xpath('.//o:OLEObject[contains(@ProgID, "ChemDraw")]') || []
          content = para_xml.xpath('.//w:t') || []

          ole_list.concat(ole)
          list_content.push(content.map(&:text).join)
        end

        block_text = list_content.join("\n")

        ole_list.each do |ole_el|
          images = ole_el.parent.xpath('.//v:imagedata')
          next if images.empty?

          imagedata = images.first
          rid = ole_el.attr('r:id')
          img_id = imagedata.attr('r:id')

          ole_rel = rels.at("//Relationship[@Id=\"#{rid}\"]")
          img_rel = rels.at("//Relationship[@Id=\"#{img_id}\"]")

          ole_target = ole_rel.attr('Target')
          img_target = img_rel.attr('Target')

          img_bin = read_from_zip(@zip_file, "word/#{img_target}")
          b64_png = Base64.strict_encode64(img_bin)
          ole_path = "#{dir}/#{ole_target}"
          @zip_file.glob("word/#{ole_target}").first.extract(ole_path)

          cdx_infos.push(
            ole_path: ole_path,
            description: block_text,
            img_ext: File.extname(img_target),
            img_b64: b64_png
          )
        end
      end

      cdx_infos
    end

    def split_docx_to_block
      # Split by numbering (manual typing + Word numbering)
      numbering_block = numbering_index_splitter

      # paragraphs within table elements are not considered in splitting
      list_table = @document_xml.xpath('.//w:tbl')
      para_in_table = list_table.reduce([]) do |arr, tbl|
        arr.concat(tbl.xpath('.//w:p'))
      end
      @para_in_table_ids = para_in_table.map { |p| p.attr('w14:paraId') }

      # Split based on lines that have one or more styles: bold, italic or underline
      styled_block = []
      numbering_block.each do |block|
        splitted_blocks = styled_line_splitter(block)
        styled_block.concat(splitted_blocks)
      end

      # If one Block has more than one schemes, split by empty line between paragraphs
      blanked_block = styled_block.reduce([]) do |arr, block|
        ole_count = 0
        block.each do |para_xml|
          list_ole = para_xml.xpath('.//o:OLEObject[contains(@ProgID, "ChemDraw")]') || []
          ole_count += list_ole.count
        end

        if ole_count > 1
          splitted_blocks = blank_line_splitter(block)
          arr.concat(splitted_blocks)
        else
          arr.push(block)
        end
      end

      list_block = []
      deleted = nil
      # Scheme should have description
      # Therefore if scheme belongs to last paragraph, it should belongs to next block
      blanked_block.each do |block|
        next if block.empty?

        last_para = block.last
        ole_last = last_para.xpath('.//o:OLEObject[contains(@ProgID, "ChemDraw")]') || []

        unless deleted.nil?
          block.unshift(deleted)
          deleted = nil
        end

        deleted = block.pop unless ole_last.empty?

        list_block.push(block)
      end

      list_block
    end

    def blank_line_splitter(block)
      list_block = []
      cur_block = []

      empty_text = 0

      block.each do |para_xml|
        list_content = para_xml.xpath('.//w:t') || []

        block_text = list_content.map(&:text).join.strip
        empty_text += 1 if block_text.empty?

        check_new_block = empty_text.positive?

        if check_new_block
          list_block.push(cur_block)
          cur_block = [para_xml]
          empty_text = 0
        else
          cur_block.push(para_xml)
        end
      end

      list_block.push(cur_block) if cur_block.count.positive?
      list_block
    end

    def styled_line_splitter(block)
      list_block = []
      cur_block = []

      block.each do |para_xml|
        id = para_xml.attr('w14:paraId')
        if @para_in_table_ids.include?(id)
          cur_block.push(para_xml)
          next
        end

        list_content = para_xml.xpath('.//w:r') || []
        list_text = para_xml.xpath('.//w:t') || []
        block_text = list_text.map(&:text).join.strip
        para_styles = para_xml.xpath('.//w:pStyle') || []

        check_style = (
          para_styles.count == 1 &&
          @style_ids.include?(para_styles.first.attr('w:val'))
        )

        styled_text = list_content.reduce([]) do |arr, r|
          next arr if r.xpath(@condition).empty?

          arr.concat(r.xpath('.//w:t') || [])
        end.map(&:text).join.strip
        length_styled = styled_text.length
        length_block = block_text.length

        check_full_para = (
          length_styled.positive? && length_styled > (length_block - 5) &&
          length_block > 5
        )
        check_new_block = check_full_para || check_style

        if check_new_block
          list_block.push(cur_block)
          cur_block = [para_xml]
        else
          cur_block.push(para_xml)
        end
      end

      list_block.push(cur_block) if cur_block.count.positive?
      list_block
    end

    def numbering_index_splitter
      list_block = []
      cur_block = []

      regex = /^(\d+|(\d+[\.-]\d+))(\.{0,1}) (?!.*=)/

      @list_para.each do |para_xml|
        list_content = para_xml.xpath('.//w:t') || []
        numbering_level = para_xml.xpath('.//w:ilvl') || []
        block_text = list_content.map(&:text).join.strip

        if block_text.match?(regex) || !numbering_level.empty?
          list_block.push(cur_block)
          cur_block = [para_xml]
        else
          cur_block.push(para_xml)
        end
      end

      list_block.push(cur_block) if cur_block.count.positive?
      list_block
    end
  end
end

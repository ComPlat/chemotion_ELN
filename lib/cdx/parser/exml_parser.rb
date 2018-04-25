# frozen_string_literal: true

module Cdx
  # Main CDX Parser module
  module Parser
    # EQUIL_ARROW = 1

    # Read and Parse ChemDraw ELN XML
    class ExmlParser
      attr_reader :reaction, :molmap

      def read(file, is_path = true)
        @molmap = {}
        @reactionmap = []
        @reaction = []

        fs = is_path ? File.open(file) : file
        xml = Nokogiri::XML(fs)

        infos = []
        sections = xml.xpath('//section')
        sections.each do |section|
          info = do_section(section)
          infos.push(info)
        end

        refine_data(infos)
        true
      end

      def do_section(section)
        section_info = {}
        section_type = section.at_xpath('sectionType')['name']

        section.xpath('./object').each do |child|
          obj_info = do_object(child)
          section_info.merge!(obj_info)
        end

        { 'type' => section_type, 'details' => section_info }
      end

      def do_object(object)
        obj_type = object.at_xpath('field')['name']
        details = do_object_detail(object)

        obj_details = case obj_type
                      when 'Preparation' then details['styledText']
                      when 'Reaction Conditions' then details['propertyInstances']
                      when 'Reaction' then details['chemicalStructure']
                      else details['tableSection']
                      end

        { obj_type => obj_details }
      end

      def do_object_detail(object)
        details = {}
        object.element_children.each do |child|
          cname = child.name
          val = case cname
                when 'styledText' then child.at_xpath('./text').text
                when 'chemicalStructure' then do_cdxml(child.content)
                when 'propertyInstances' then do_property_instances(child)
                when 'tableSection' then do_table_section(child)
                end

          details[cname] = val unless val.nil?
        end

        details
      end

      def do_property_instances(prop_instances)
        props = {}

        prop_instances.xpath('./propertyInstance').each do |prop|
          pname = prop.at_xpath('property')['name']
          val = read_value(prop['minValue'], prop['maxValue'], prop['value'])
          props[pname] = val unless val.nil?
        end

        props
      end

      def do_table_section(table)
        infos = []

        tprops = do_table_props(table.xpath('./tableProperty'))
        props = %w[ID parentID].concat(tprops)
        values = do_table_rows(table.xpath('./tableRow'))

        values.each do |rvalue|
          info = {}
          rvalue.each_with_index do |val, idx|
            info[props[idx]] = val
          end

          infos.push(info)
        end

        infos
      end

      def do_table_props(cols)
        props = []
        cols.each do |col|
          pname = col.at_xpath('property')['name']
          props.push(pname)
        end

        props
      end

      def do_table_rows(rows)
        rows_values = []
        rows.each do |row|
          tags = row.at_xpath('./tags')
          tags = { 'ID' => nil, 'parentID' => nil } if tags.nil?
          values = row.xpath('./tableCell').map { |x|
            read_value(x['minValue'], x['maxValue'], x['value'])
          }
          rows_values.push([tags['ID'], tags['parentID']].concat(values))
        end

        rows_values
      end

      def do_cdxml(cdxml)
        cp = Cdx::Parser::CdxmlParser.new
        cp.read(cdxml, false)

        cp
      end

      def read_value(min, max, val)
        mm = min.nil? && max.nil?
        return nil if mm && val.nil?
        return val if mm

        min == max ? val : `${min} ~ ${max}`
      end

      def refine_data(infos)
        infos.each do |section|
          section_details = section['details']
          cp = section_details['Reaction']
          @molmap.merge!(cp.molmap)
          @reactionmap = @reactionmap.concat(cp.reactionmap.values)
          @reaction = @reaction.concat(cp.reaction)

          section_details.each do |key, details|
            next if key == 'Reaction'
            add_details(key, details)
          end
        end
      end

      def add_details(key, details)
        return if details.nil? || details.empty?

        if details.class == Array
          details.each do |detail|
            try_add_molecule_details(key, detail)
          end
        else
          add_reaction_details(key, details)
        end
      end

      def try_add_molecule_details(key, detail)
        id_str = detail['ID']
        if id_str.nil?
          add_reaction_details(key, detail)
          return
        end

        id = id_str.to_i
        if @molmap.keys.include?(id)
          detail.delete('Chemical Structure')
          add_molecule_details(id, key, detail)
        else
          add_reaction_details(key, detail)
        end
      end

      def add_molecule_details(id, group, detail)
        @molmap[id][:detail] = detail
        sgroup = group.downcase.to_sym

        rid = nil
        gid = nil
        @reactionmap.each_with_index do |rgroup, rgid|
          idx = rgroup[sgroup].index(id)
          next if idx.nil?
          rid = rgid
          gid = idx
        end
        return if rid.nil? || gid.nil?

        @reaction[rid][sgroup][gid][:detail] = detail
      end

      def add_reaction_details(group, detail)
        group = 'Reaction Description' if %w[Reactants Products].include?(group)

        reaction = @reaction.last
        reaction[:detail] = {} if reaction[:detail].nil?
        reaction[:detail][group] = [] if reaction[:detail][group].nil?
        reaction[:detail][group].push(detail)
      end
    end
  end
end

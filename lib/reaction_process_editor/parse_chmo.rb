# frozen_string_literal: true

# doc = File.open('chmo.owl') { |f| Nokogiri::XML(f) }
require 'csv'
class ParseChmo
  CHMO_IDS = %w[CHMO_0002415
                CHMO_0002174
                CHMO_0000003
                CHMO_0000067
                CHMO_0001215
                CHMO_0002834
                CHMO_0000156
                CHMO_0000160
                CHMO_0000915
                CHMO_0001167
                CHMO_0000228
                CHMO_0001163
                CHMO_0000681
                CHMO_0001470
                CHMO_0001487
                CHMO_0001532
                CHMO_0001577
                CHMO_0001658
                OBI_0600014
                CHMO_0001685
                CHMO_0002548
                CHMO_0002916
                CHMO_0001000
                CHMO_0002231
                CHMO_0001904
                CHMO_0002244
                CHMO_0001709
                CHMO_0000997].freeze

  def run(doc)
    CHMO_IDS.each do |chmo_id|
      Rails.logger.debug { "run #{chmo_id}" }
      root_node = parse_root(doc: doc, chmo_id: chmo_id)

      Rails.logger.debug { "root_node #{root_node}" }
      nodes = [root_node]
      nodes << parse_sub_nodes(doc: doc, chmo_id: chmo_id)
      Rails.logger.debug { "nodes count #{nodes.count}" }
      Rails.logger.debug { "nodes flat count #{nodes.flatten.count}" }
      write_csv(nodes: nodes.flatten,
                filename: "#{chmo_id}_#{parse_label(nodes.flatten.first)}")
    end
  end

  def parse_root(doc:, chmo_id:)
    Rails.logger.debug { "run parse_root #{chmo_id}" }

    doc.xpath("//owl:Class[contains(@rdf:about, '#{chmo_id}')]").first
  end

  def parse_sub_nodes(doc:, chmo_id:)
    Rails.logger.debug { "run parse_subnode #{chmo_id}" }
    doc.xpath("//owl:Class[rdfs:subClassOf[contains(@rdf:resource, '#{chmo_id}')]]").map do |node|
      current_node_id = parse_chmo_id(node).tr(':', '_')
      [node] << parse_sub_nodes(doc: doc, chmo_id: current_node_id)
    end
  end

  def write_csv(nodes:, filename:)
    headers = ['CHMO', 'Ontology Name', 'Own Name', 'Full Link', 'Parent']
    CSV.open("chmo_ontologies/#{filename}.csv", 'w',
             write_headers: true,
             headers: headers,
             col_sep: ';') do |csv|
      nodes.flatten.each do |node|
        chmo_id = parse_chmo_id(node)
        name = "CHMO: #{parse_label(node)}"
        link = parse_link(node)
        csv << [chmo_id, name, '', link]
      end
    end
  end

  def parse_chmo_id(node)
    node.at_xpath('.//oboInOwl:id').children.text
  end

  def parse_label(node)
    node.at_xpath('.//rdfs:label').children.text
  end

  def parse_link(node)
    node.at_xpath('.//@rdf:about').children.text
  end
end

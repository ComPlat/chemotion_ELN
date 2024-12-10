# frozen_string_literal: true

# doc = File.open('chmo.owl') { |f| Nokogiri::XML(f) }
#
# Helper-Script to extract the desired CHMO_IDS fro the official chmo.owl file in the csv format we need for our
# ontologies definition files used in the ReactionProcessEditor. It assembles all descendants for each CHMO id.
# This script needed to run only once (November 2024) but is kept archived. cbuggle, 10.12.202
#
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

  def self.run
    doc = Rails.root.join('data/reaction-process-editor/chmo.owl').open do |f|
      Nokogiri::XML(f)
    end
    nodes = []
    CHMO_IDS.each do |chmo_id|
      root_node = parse_root(doc: doc, chmo_id: chmo_id)
      nodes << root_node
      nodes << parse_sub_nodes(doc: doc, chmo_id: chmo_id)
    end
    write_csv(nodes: nodes.flatten,
              filename: 'ontologies')
  end

  def self.parse_root(doc:, chmo_id:)
    doc.xpath("//owl:Class[contains(@rdf:about, '#{chmo_id}')]").first
  end

  def self.parse_sub_nodes(doc:, chmo_id:)
    doc.xpath("//owl:Class[rdfs:subClassOf[contains(@rdf:resource, '#{chmo_id}')]]").map do |node|
      current_node_id = parse_chmo_id(node).tr(':', '_')
      [node] << parse_sub_nodes(doc: doc, chmo_id: current_node_id)
    end
  end

  def self.write_csv(nodes:, filename:)
    headers = ['Ontology Id', 'Ontology Name', 'Custom Label', 'Link', 'Roles', 'Detectors', 'Solvents']
    CSV.open("data/reaction-process-editor/#{filename}.csv", 'w',
             write_headers: true,
             headers: headers,
             col_sep: ';') do |csv|
      nodes = nodes.flatten.uniq { |node| parse_chmo_id(node) }
      nodes.each do |node|
        chmo_id = parse_chmo_id(node)
        name = parse_label(node)
        link = parse_link(node)
        csv << [chmo_id, name, '', link]
      end
    end
  end

  def self.parse_chmo_id(node)
    node.at_xpath('.//oboInOwl:id').children.text
  end

  def self.parse_label(node)
    node.at_xpath('.//rdfs:label').children.text
  end

  def self.parse_link(node)
    node.at_xpath('.//@rdf:about').children.text
  end
end

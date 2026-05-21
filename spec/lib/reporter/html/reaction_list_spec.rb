# frozen_string_literal: true

require 'rails_helper'

describe 'Reporter::Html::ReactionList instance' do
  include_context 'Report shared declarations'

  let(:html_file) do
    tempfile = Tempfile.new(['rspec', '.html'])
    Reporter::Html::ReactionList.new(
      objs: [serialized_reaction],
      template_path: Rails.root.join('lib', 'template', 'rxn_list.html.erb')
    ).create(tempfile)
    tempfile.read
  end

  it 'contains a html file' do
    [product1, product2].each do |product|
      expect(html_file).to include(product.molecule.inchistring)
      expect(html_file).to include(product.molecule.inchikey)
      expect(html_file).to include(reaction.rinchi_long_key)
      expect(html_file).to include(reaction.rinchi_web_key)
      expect(html_file).to include(reaction.rinchi_short_key)
    end
  end
end

require 'rails_helper'

describe 'Reporter::Html::ReactionList instance' do
  include_context 'Report shared declarations'

  before do
    t_file = Tempfile.new(['rspec', '.html'])
    Reporter::Html::ReactionList.new(
      objs: @obj_hash,
      template_path: Rails.root.join('lib', 'template', 'rxn_list.html.erb')
    ).create(Pathname.new(t_file.path))
    @target = File.open(t_file.path).read
  end

  it 'contains a html file' do
    [@sp_prd_a, @sp_prd_b].each_with_index do |prd, idx|
      expect(@target).to include(prd.molecule.inchistring)
      expect(@target).to include(prd.molecule.inchikey)
      expect(@target).to include(@r1.rinchi_long_key)
      expect(@target).to include(@r1.rinchi_web_key)
      expect(@target).to include(@r1.rinchi_short_key)
    end
  end
end

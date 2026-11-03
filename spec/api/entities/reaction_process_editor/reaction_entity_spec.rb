# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::ReactionEntity do
  subject(:represented_reaction) { described_class.represent(reaction).as_json }

  let(:reaction) { create(:reaction) }

  it 'exposes reaction.id as :value' do
    expect(represented_reaction).to include({ value: reaction.id })
  end

  it 'exposes :short_label' do
    expect(represented_reaction).to include({ short_label: reaction.short_label })
  end

  it 'exposes :reaction_svg_file' do
    expect(represented_reaction).to include({ reaction_svg_file: String })
  end
end

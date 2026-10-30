# frozen_string_literal: true

FactoryBot.define do
  factory :provenance, class: 'ReactionProcessEditor::Provenance' do
    reaction_process

    starts_at { Time.zone.now }
    city { 'Karlsruhe' }
    doi { '10.1109/5.771073' }
    patent { 'Creative Commons' }
    publication_url { 'https://github.com/comPlat/chemotion_ELN' }
    username { 'User1 Complat' }
    name { 'Middle Of A Chain Reaction' }
    orcid { '0000-0002-1825-0097' }
    organization { 'KIT IOC' }
    email { 'complat.user1@eln.edu' }
  end
end

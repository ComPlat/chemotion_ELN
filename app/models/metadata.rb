# == Schema Information
#
# Table name: metadata
#
#  id            :bigint           not null, primary key
#  collection_id :integer
#  metadata      :jsonb
#  deleted_at    :datetime
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

class Metadata < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection

  def table_of_contents
    # fetch all molecules for this collection and create toc
    molecules = Molecule.joins(:samples).joins(:collections).where('collections.id = ?', self.collection.id).distinct
    molecule_names = molecules.map do |molecule|
      mn = "[#{molecule.sum_formular}]"
      mn << " #{molecule.iupac_name}]" if molecule.iupac_name
    end
    table_of_contents = molecule_names.join("\n")
  end

  def to_radar_json
    raise 'RADAR credentials not initialized!' unless Rails.configuration.radar

    radar_metadata = {
      'technicalMetadata' => {
          "retentionPeriod" => 10,
          "archiveDate" => Time.now.utc.to_i,
          "publishDate" => Time.now.utc.to_i,
          "responsibleEmail" => Rails.configuration.radar.email,
          "publicationBacklink" => Rails.configuration.radar.backlink,
          "schema" => {
              "key" => "RDDM",
              "version" => "9.1"
          }
      },
      'descriptiveMetadata' => {
        'descriptions' => {
          'description' => [{
              'value': @table_of_contents,
              'descriptionType': 'TABLE_OF_CONTENTS'
          }]
        },
        'productionYear' => Time.now.utc.year,
        'publicationYear' => Time.now.utc.year,
        'language' => 'ENG',
        'publisher' => {
          'value' => Rails.configuration.radar.publisher
        },
        'resource' => {
          'value' => Rails.configuration.radar.resource,
          'resourceType' => Rails.configuration.radar.resourceType
        },
        'software' => {
          'softwareType' => [{
            'type' => 'RESOURCE_PRODUCTION',
            'softwareName' => [{
              'value' => Rails.configuration.radar.softwareName,
              'softwareVersion' => Rails.configuration.radar.softwareVersion
            }]
          }]
        }
      }
    }

    if self.metadata['title']
      radar_metadata['descriptiveMetadata']['title'] = self.metadata['title']
    end

    if self.metadata['description']
      radar_metadata['descriptiveMetadata']['descriptions']['description'] << {
          'value': self.metadata['description'],
          'descriptionType': 'ABSTRACT'
      }
    end

    if self.metadata['subjectAreas']
      radar_metadata['descriptiveMetadata']['subjectAreas'] = {
        'subjectArea' => self.metadata['subjectAreas']
      }
    end

    if self.metadata['keywords']
      radar_metadata['descriptiveMetadata']['keywords'] = {
        'keyword' => self.metadata['keywords'].map {|keyword| {'value': keyword}}
      }
    end

    if self.metadata['creators']
      radar_metadata['descriptiveMetadata']['creators'] = {
        'creator' => self.metadata['creators'].map do |creator|
          radar_creator = {
            'creatorName' => creator['givenName'] + ' ' + creator['familyName'],
            'givenName' => creator['givenName'],
            'familyName' => creator['familyName']
          }

          unless creator['orcid'].blank?
            radar_creator['nameIdentifier'] = [{
              'value': creator['orcid'],
              'schemeURI': 'http://orcid.org',
              'nameIdentifierScheme': 'ORCID'
            }]
          end

          if creator['affiliations']
            radar_creator['creatorAffiliation'] = {
              'value': creator['affiliations'][0]['affiliation']
            }
          end

          radar_creator
        end
      }
    end

    if self.metadata['contributors']
      radar_metadata['descriptiveMetadata']['contributors'] = {
        'contributor' => self.metadata['contributors'].map do |contributor|
          radar_contributor = {
            'contributorName' => contributor['givenName'] + ' ' + contributor['familyName'],
            'contributorType' => contributor['contributorType'],
            'givenName' => contributor['givenName'],
            'familyName' => contributor['familyName']
          }

          unless contributor['orcid'].blank?
            radar_contributor['nameIdentifier'] = [{
              'value': contributor['orcid'],
              'schemeURI': 'http://orcid.org',
              'nameIdentifierScheme': 'ORCID'
            }]
          end

          if contributor['affiliations']
            radar_contributor['contributorAffiliation'] = {
              'value': contributor['affiliations'][0]['affiliation']
            }
          end

          radar_contributor
        end
      }
    end

    if self.metadata['alternateIdentifiers']
      radar_metadata['descriptiveMetadata']['alternateIdentifiers'] = {
        'alternateIdentifier' => self.metadata['alternateIdentifiers']
      }
    end

    if self.metadata['relatedIdentifiers']
      radar_metadata['descriptiveMetadata']['relatedIdentifiers'] = {
        'relatedIdentifier' => self.metadata['relatedIdentifiers']
      }
    end

    if self.metadata['rightsHolders']
      radar_metadata['descriptiveMetadata']['rightsHolders'] = {
        'rightsHolder' => self.metadata['rightsHolders'].map {|rights_holder| {'value': rights_holder}}
      }
    end

    if self.metadata['rights']
      radar_metadata['descriptiveMetadata']['rights'] = self.metadata['rights'][0]
    end

    if self.metadata['fundingReferences']
      radar_metadata['descriptiveMetadata']['fundingReferences'] = {
        'fundingReference' => self.metadata['fundingReferences'].map do |fundingReference|
          radar_funding_reference = {
            'funderName': fundingReference['funderName']
          }

          unless fundingReference['funderIdentifier'].blank?
            radar_funding_reference['funderIdentifier'] = {
              'value': fundingReference['funderIdentifier'],
              'type': fundingReference['funderIdentifierType'] ? fundingReference['funderIdentifierType'] : 'OTHER'
            }
          end

          unless fundingReference['awardNumber'].blank?
            radar_funding_reference['awardNumber'] = fundingReference['awardNumber']
          end

          unless fundingReference['awardURI'].blank?
            radar_funding_reference['awardURI'] = fundingReference['awardURI']
          end

          unless fundingReference['awardTitle'].blank?
            radar_funding_reference['awardTitle'] = fundingReference['awardTitle']
          end

          radar_funding_reference
        end
      }
    end

    radar_metadata.to_json
  end

  def set_radar_ids(dataset_id, file_id)
    self.metadata['datasetId'] = dataset_id
    self.metadata['datasetUrl'] = "#{Rails.configuration.radar&.url}/radar/en/dataset/#{dataset_id}"
    self.metadata['fileId'] = file_id
    self.metadata['fileUrl'] = "#{Rails.configuration.radar&.url}/radar/en/file/#{file_id}"
    self.save!
  end

  def reset_radar_ids
    self.metadata['datasetId'] = nil
    self.metadata['datasetUrl'] = nil
    self.metadata['fileId'] = nil
    self.metadata['fileUrl'] = nil
    self.save!
  end
end

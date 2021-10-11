module Export
  class ExportRadar

    def initialize(job_id, collection_id, user_id)
      raise 'RADAR credentials not initialized!' unless Rails.configuration.radar

      @job_id = job_id
      @collection_id = collection_id
      @user_id = user_id

      @collection = Collection.find(@collection_id)
      @metadata = @collection.metadata.metadata
      @radarId = @collection.metadata.metadata['radarId']

      @user = User.find(@user_id)

      @title = "[#{@user.name_abbreviation}-#{SecureRandom.alphanumeric(4)}] #{@metadata['title']}"

      @archive_date = Time.now.utc
      @publish_date = @archive_date
      @production_date = @archive_date

      @responsible_email = Rails.configuration.radar.email
      @publication_backlink = Rails.configuration.radar.backlink

      @assets = []
    end

    def to_json
      radar_metadata = {
        'technicalMetadata' => {
            "retentionPeriod" => 10,
            "archiveDate" => @archive_date.to_i,
            "publishDate" => @publish_date.to_i,
            "responsibleEmail" => @responsible_email,
            "publicationBacklink" => @publication_backlink,
            "schema" => {
                "key" => "RDDM",
                "version" => "09"
            }
        },
        'descriptiveMetadata' => {
          'title' => @title,
          'productionYear' => @production_date.year,
          'publicationYear' => @publish_date.year,
          'language' => 'ENG',
          'publishers' => {
            'publisher' => [Rails.configuration.radar.publisher]
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

      if @metadata['description']
        radar_metadata['descriptiveMetadata']['descriptions'] = {
          'description' => [
            {
                'value': @metadata['description'],
                'descriptionType': 'ABSTRACT'
            }
          ]
        }
      end

      if @metadata['subjectAreas']
        radar_metadata['descriptiveMetadata']['subjectAreas'] = {
          'subjectArea' => @metadata['subjectAreas']
        }
      end

      if @metadata['keywords']
        radar_metadata['descriptiveMetadata']['keywords'] = {
          'keyword' => @metadata['keywords']
        }
      end

      if @metadata['creators']
        radar_metadata['descriptiveMetadata']['creators'] = {
          'creator' => @metadata['creators'].map do |creator|
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
              radar_creator['creatorAffiliation'] = creator['affiliations'][0]['affiliation']
            end

            radar_creator
          end
        }
      end

      if @metadata['contributors']
        radar_metadata['descriptiveMetadata']['contributors'] = {
          'contributor' => @metadata['contributors'].map do |contributor|
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
              radar_contributor['contributorAffiliation'] = contributor['affiliations'][0]['affiliation']
            end

            radar_contributor
          end
        }
      end

      if @metadata['alternateIdentifiers']
        radar_metadata['descriptiveMetadata']['alternateIdentifiers'] = {
          'alternateIdentifier' => @metadata['alternateIdentifiers']
        }
      end

      if @metadata['relatedIdentifiers']
        radar_metadata['descriptiveMetadata']['relatedIdentifiers'] = {
          'relatedIdentifier' => @metadata['relatedIdentifiers']
        }
      end

      if @metadata['rightsHolders']
        radar_metadata['descriptiveMetadata']['rightsHolders'] = {
          'rightsHolder' => @metadata['rightsHolders']
        }
      end

      if @metadata['rights']
        radar_metadata['descriptiveMetadata']['rights'] = @metadata['rights'][0]
      end

      if @metadata['fundingReferences']
        radar_metadata['descriptiveMetadata']['fundingReferences'] = {
          'fundingReference' => @metadata['fundingReferences'].map do |fundingReference|
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

    def fetch_access_token
      url = Rails.configuration.radar.url + '/radar/api/tokens'
      body = {
        'clientId' => Rails.configuration.radar.client_id,
        'clientSecret' => Rails.configuration.radar.client_secret,
        'redirectUrl' => Rails.configuration.radar.redirect_url,
        'userName' => Rails.configuration.radar.username,
        'userPassword' => Rails.configuration.radar.password
      }
      headers = {
        'Content-Type' => 'application/json'
      }

      begin
        response = HTTParty.post(url, :body => body.to_json, :headers => headers)
        @access_token = JSON.parse(response.body)['access_token']
      rescue StandardError => e
        Rails.logger.error('Could not fetch access token from RADAR')
      end
    end

    def store_dataset
      headers = {
        'Authorization' => 'Bearer ' + @access_token,
        'Content-Type' => 'application/json'
      }
      body = self.to_json

      # to be removed
      @radarId = nil

      if @radarId.nil?
        # create a new dataset
        url = Rails.configuration.radar.url + '/radar/api/workspaces/' + Rails.configuration.radar.workspace_id + '/datasets'
        begin
          response = HTTParty.post(url, :body => body, :headers => headers)

          if response.code == 201
            @radar_id = JSON.parse(response.body)['id']
          else
            Rails.logger.error("Error with RADAR: #{response.body} (#{response.code})")
          end
        rescue StandardError => e
          Rails.logger.error('Could not create dataset in RADAR')
        end

        # store the radar id in the metadata json
        @collection.metadata.metadata['radarId'] = @radar_id
        @collection.metadata.metadata['radarUrl'] = Rails.configuration.radar.url + '/radar/en/dataset/' + @radar_id
        @collection.metadata.save!
      else
        # update dataset
        url = Rails.configuration.radar.url + '/radar/api/datasets/' + @radarId

        begin
          response = HTTParty.put(url, :body => body, :headers => headers)

          unless response.code == 200
            Rails.logger.error("Error with RADAR: #{response.body} (#{response.code})")
          end
        rescue StandardError => e
          Rails.logger.error('Could not update dataset in RADAR')
        end
      end
    end

    def create_assets
      export = Export::ExportCollections.new(@job_id, [@collection_id], 'zip', true)
      export.prepare_data
      export.to_file
      @assets << export.file_path
    end

    def upload_assets
      url = Rails.configuration.radar.url + '/radar-ingest/upload/' + @radar_id + '/file'
      headers = {
        'Authorization' => 'Bearer ' + @access_token
      }

      @assets.each do |asset|
        body = {
          'upload_file' => File.open(asset)
        }

        begin
          response = HTTParty.post(url, :body => body, :headers => headers)
        rescue StandardError => e
          Rails.logger.error('Could not create dataset in RADAR')
        end
      end
    end
  end
end

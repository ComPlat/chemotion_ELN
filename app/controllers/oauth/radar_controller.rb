class Oauth::RadarController < ApplicationController
  respond_to :html

  def archive
    collection_id = request.GET['collection_id']
    unless collection_id
      @error = 'No collection id was provided.'
      return render status: 400
    end

    # check if the collection exists and belongs to the user
    collection = Collection.accessible_for(current_user).find_by(id: collection_id)
    unless collection
      @error = 'You are not allowed to access this collection.'
      return render status: 403
    end

    # store collection in the session
    session[:radar_collection_id] = collection_id

    # create random state and store it in the session
    session[:radar_oauth2_state] = state = Oauth2::Radar::state

    redirect_to Oauth2::Radar::get_authorize_url(state)
  end

  def callback
    unless request.GET['state'] == session.delete(:radar_oauth2_state)
      return render status: 400, json: {:error => 'state parameter did not match'}.to_json
    end

    # fetch the access_token and store it in the session
    response = Oauth2::Radar::fetch_access_token(request.GET['code'])
    session[:radar_access_token] = access_token = response['access_token']

    redirect_to action: 'select'
  end

  # rubocop:disable Metrics/AbcSize, Metrics/MethodLength, MetricsPerceivedComplexity
  def select
    collection_id = session[:radar_collection_id]
    access_token = session[:radar_access_token]

    # get the collection and check if it exists and belongs to the user
    collection = Collection.accessible_for(current_user).find_by(id: collection_id)
    unless collection
      @error = 'You are not allowed to access this collection.'
      return render status: 403
    end

    if request.post?
      # get the workspaces from the session
      @workspaces = session[:radar_workspaces]

      workspace_id = request.POST['workspace']
      if workspace_id
        response = Oauth2::Radar::store_dataset(access_token, workspace_id, collection.metadata.to_radar_json)

        if (response['exception'])
          @error = response['exception']
        else
          # reset the stored radar ids
          collection.metadata.reset_radar_ids

          # enqueue the job to create the files and upload them to radar
          ExportCollectionToRadarJob.perform_later(access_token, collection_id, response['id'])

          return redirect_to action: 'export'
        end
      else
        @error = 'Please select one of your workspaces.'
        return render status: 400
      end
    else
      # fetch the available workspaces for the user
      response = Oauth2::Radar::fetch_workspaces(access_token)

      @workspaces = response['data'].map { |workspace| {
        'id' => workspace['id'],
        'label' => workspace['descriptiveMetadata']['title']
      }}

      # check if any workspaces were found
      if @workspaces.empty?
        @error = 'No workspaces could be retrieved from RADAR. Please make sure that at least one workspace is available.'
        return render status: 400
      end

      # store the workspaces in the session
      session[:radar_workspaces] = @workspaces
    end

    render
  end
  # rubocop:enable Metrics/AbcSize, Metrics/MethodLength, MetricsPerceivedComplexity

  def export
    collection_id = session[:radar_collection_id]

    # get the collection and check if it exists and belongs to the user
    collection = Collection.accessible_for(current_user).find_by(id: collection_id)
    unless collection
      @error = 'You are not allowed to access this collection.'
      return render status: 403
    end

    unless collection.metadata.metadata['datasetUrl'].nil?
      return redirect_to collection.metadata.metadata['datasetUrl']
    else
      return render
    end
  end
end

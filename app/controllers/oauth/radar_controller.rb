class Oauth::RadarController < ApplicationController
  respond_to :html

  def archive
    collection_id = request.GET['collection_id']
    unless collection_id
      return render status: 400, json: {:error => 'No collection_id provided'}.to_json
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

  def select
    collection_id = session[:radar_collection_id]
    access_token = session[:radar_access_token]

    collection = Collection.find(collection_id)

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

          redirect_to action: 'export'
          return
        end
      else
        @error = 'Please select one of your workspaces.'
      end
    else
      # fetch the available workspaces for the user
      response = Oauth2::Radar::fetch_workspaces(access_token)
      session[:radar_workspaces] = @workspaces = response['data']
    end

    render
  end

  def export
    collection_id = session[:radar_collection_id]
    collection = Collection.find(collection_id)

    puts collection.metadata.metadata['datasetURL'].nil?

    unless collection.metadata.metadata['datasetURL'].nil?
      redirect_to collection.metadata.metadata['datasetURL']
    else
      render
    end
  end
end

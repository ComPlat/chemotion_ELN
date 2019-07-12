class AddCollectionZipNotification < ActiveRecord::Migration
  def change
    channel = Channel.find_or_create_by(subject: Channel::COLLECTION_ZIP)
    attributes = {
      subject: Channel::COLLECTION_ZIP,
      channel_type: 8,
      msg_template: '{"data": "Collection %{operation}: %{col_labels} processed successfully. %{expires_at}",
                      "action":"CollectionActions.fetchUnsharedCollectionRoots",
                      "level": "success"
                     }'
    }
    channel.update(attributes) if channel

    channel = Channel.find_or_create_by(subject: Channel::COLLECTION_ZIP_FAIL)
    attributes = {
      subject: Channel::COLLECTION_ZIP_FAIL,
      channel_type: 8,
      msg_template: '{"data": "Collection %{operation}: There was an issue while processing %{col_labels}.",
                      "action":"CollectionActions.fetchUnsharedCollectionRoots",
                      "level": "error"
                     }'
    }
    channel.update(attributes) if channel

    channel = defined?(Channel::COLLECTION_TAKE_OWNERSHIP) && Channel.find_by(subject: Channel::COLLECTION_TAKE_OWNERSHIP)
    attributes = {
      subject: Channel::COLLECTION_TAKE_OWNERSHIP,
      channel_type: 8,
      msg_template: '{"data": "%{new_owner} has taken ownership of collection: %{collection_name}.",
                      "action":"CollectionActions.fetchUnsharedCollectionRoots", "level": "info"
                     }'
    }
    channel.update(attributes) if channel

    channel = defined?(Channel::COMPUTED_PROPS_NOTIFICATION) && Channel.find_by(subject: Channel::COMPUTED_PROPS_NOTIFICATION)
    attributes = {
      subject: Channel::COMPUTED_PROPS_NOTIFICATION,
      channel_type: 8,
      msg_template: '{"data": "Calculation for Sample %{sample_id} has %{status}", "action":"ElementActions.refreshComputedProp", "cprop": {} }'
    }
    channel.update(attributes) if channel

    channel = defined?(Channel::EDITOR_CALLBACK) && Channel.find_by(subject: Channel::EDITOR_CALLBACK)
    attributes = {
      subject: Channel::EDITOR_CALLBACK,
      channel_type: 8,
      msg_template: '{"data": "%{filename}: has been updated.",
                      "action":"ElementActions.fetchResearchPlanById",
                      "research_plan_id": 0, "attach_id": 0,
                      "level": "success"
                     }'
    }
    channel.update(attributes) if channel

    channel = defined?(Channel::GATE_TRANSFER_NOTIFICATION) && Channel.find_by(subject: Channel::GATE_TRANSFER_NOTIFICATION)
    attributes = {
      subject: Channel::GATE_TRANSFER_NOTIFICATION,
      channel_type: 8,
      msg_template: '{"data": "Data tranfer from your collection [chemotion.net] to Chemotion-Repository: %{comment}",
                      "action":"RefreshChemotionCollection",
                      "level": "success"
                     }'
    }
    channel.update(attributes) if channel

    channel = defined?(Channel::REPORT_GENERATOR_NOTIFICATION) && Channel.find_by(subject: Channel::REPORT_GENERATOR_NOTIFICATION)
    attributes = {
      subject: Channel::REPORT_GENERATOR_NOTIFICATION,
      channel_type: 8,
      msg_template: '{"data": "%{report_name} is ready for download!",
                      "action":"ReportActions.updateProcessQueue",
                      "report_id": 0
                     }'
    }
    channel.update(attributes) if channel

    channel = defined?(Channel::SEND_IMPORT_NOTIFICATION) && Channel.find_by(subject: Channel::SEND_IMPORT_NOTIFICATION)
      attributes = {
        subject: Channel::SEND_IMPORT_NOTIFICATION,
        channel_type: 8,
        msg_template: '{ "data": "%<data>", "level": "info", "action":"CollectionActions.fetchUnsharedCollectionRoots" }'
      }
    channel.update(attributes) if channel
  end
end

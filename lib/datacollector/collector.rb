class Collector
  attr_reader :device, :device_container, :recipient, :device_recipient_known

  def device_to_recipient(device_email, recipient_email)
    device = Device.find_by email: device_email
    recipient = User.find_by email: recipient_email
    if device && recipient
      @device_recipient_known = true
      @device = device
      @recipient = recipient

      prepare_containers
    else
      @device_recipient_known = false
    end
  end

  def prepare_containers
    @recipient.container = Container.create(name: "inbox", container_type: "root") unless @recipient.container

    device_box_id = "device_box_" + @device.id.to_s
    @device_container = Container.where(container_type: device_box_id, parent_id: @recipient.container.id).first
    if !@device_container
      @device_container = Container.create(name: @device.first_name, container_type: device_box_id, parent: @recipient.container)
    end
  end
end

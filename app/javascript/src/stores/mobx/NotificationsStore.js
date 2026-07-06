import { types } from 'mobx-state-tree';
import toast from 'react-hot-toast';

const POSITION_MAP = {
  tr: 'top-right',
  tl: 'top-left',
  tc: 'top-center',
  br: 'bottom-right',
  bl: 'bottom-left',
  bc: 'bottom-center',
};

const LEVEL_TO_ALERT = {
  success: 'alert-success',
  error: 'alert-danger',
  warning: 'alert-warning',
  info: 'alert-info',
};

const buildOptions = ({ title, position, autoDismiss, uid, action, level }) => {
  const options = {};
  if (title) options.title = title;
  if (position) options.position = POSITION_MAP[position] || position;
  if (autoDismiss === 0) options.duration = Infinity;
  else if (autoDismiss !== undefined) options.duration = autoDismiss * 1000;
  if (uid) options.id = uid;
  if (action) options.action = action;
  if (level) options.level = level;
  return options;
};

export const NotificationsStore = types
  .model({})
  .actions((self) => ({
    add({ title, message, level = 'info', position, autoDismiss, uid, action }) {
      const options = buildOptions({ title, position, autoDismiss, uid, action, level });

      switch (level) {
        case 'success': toast.success(message, options); break;
        case 'error': toast.error(message, options); break;
        default: toast(message, options);
      }
    },

    removeByUid(uid) {
      toast.dismiss(uid);
    },

    notifyExImportStatus(title, status) {
      const params = {
        title,
        message: 'The task has been submitted: this might take a while but you will be notified as soon as it is completed.',
        level: 'info',
        uid: 'export_collection',
        position: 'tr',
        autoDismiss: 5,
      };

      if (status === 401) {
        params.message = 'Unauthorized: you do not have the permission to perform this action on this collection';
        params.level = 'error';
      } else if (status !== 204) {
        params.message = `An issue occurred with your ${title} (status ${status}); please contact the administrators of the site if the problem persists.`;
        params.level = 'error';
      }

      self.add(params);
    },

    notifyImportSamplesFromFile(result) {
      const num = result.data?.length ?? 0;
      const { status, sdf, message } = result;
      self.removeByUid('import_samples_upload');

      let notification = {
        title: 'Oops!',
        message: `${message}\n Please check the file and try again.`,
        level: 'error',
        position: 'bl',
        autoDismiss: 0,
      };

      if (sdf) {
        if (status === 'ok') {
          notification = { title: 'Success', message, level: 'success', position: 'bl', autoDismiss: 10 };
        } else if (status === 'invalid') {
          notification.message = message;
        }
      } else if (status === 'ok') {
        notification = {
          title: 'Success',
          message: `The ${num} samples have been imported successfully`,
          level: 'success',
          position: 'bl',
          autoDismiss: 10,
        };
      } else if (status === 'invalid') {
        notification.message = message;
      } else if (status === 'in progress') {
        notification = { title: 'Status', message, level: 'success', position: 'bl', autoDismiss: 10 };
      } else if (status === 'warning') {
        notification = {
          title: 'Status',
          message: `The ${num} samples have been imported successfully but ${message}`,
          level: 'success',
          position: 'bl',
          autoDismiss: 10,
        };
      }

      self.add(notification);
    },
  }));

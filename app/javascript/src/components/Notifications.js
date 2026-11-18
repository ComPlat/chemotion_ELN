import React from 'react';
import { capitalizeWords } from 'src/utilities/textHelper';
import { Toaster, ToastBar, toast } from 'react-hot-toast';

const TOAST_TYPE_TO_ALERT = {
  success: 'alert-success',
  error: 'alert-danger',
  warning: 'alert-warning',
  loading: 'alert-info',
  blank: 'alert-info',
};

const toastBarStyle = { padding: 0, background: 'none', boxShadow: 'none' };

const Notifications = () => (
  <Toaster position="top-right">
    {(t) => {
      if (t.type === 'custom') {
        // Custom toasts (with action button) handle their own Bootstrap styling
        return <ToastBar toast={t} style={toastBarStyle} />;
      }

      let actionCloseButton = '';
      if (t.action) {
        actionCloseButton = (
          <button
            type="button"
            className={'btn btn-danger'}
            onClick={() => { t.action.callback(); toast.dismiss(t.id); }}
          >
            {t.action.label}
          </button>
        );
      }
      const alertType = t.level && t.level === 'warning' ? t.level : t.type;
      const alertClass = TOAST_TYPE_TO_ALERT[alertType] || 'alert-info';
      const title = t.title ? t.title : capitalizeWords(t.level);

      return (
        <ToastBar toast={t} style={toastBarStyle}>
          {({ icon, message }) => (
            <div
              role="alert"
              className={`alert ${alertClass} notification`}
              style={{ minWidth: 280, maxWidth: 420 }}
            >
              <div className={`notification-headline gap-2 ${t.level}`}>
                <strong className="w-100">{title}</strong>
                <button
                  type="button"
                  className="btn-close flex-shrink-0"
                  aria-label="Close"
                  onClick={() => toast.dismiss(t.id)}
                />
              </div>
              <div className="notification-body p-3">
                <div className="d-flex align-items-start gap-2">
                  {icon}
                  {message}
                </div>
                {actionCloseButton}
              </div>
            </div>
          )}
        </ToastBar>
      );
    }}
  </Toaster>
);

export default Notifications;

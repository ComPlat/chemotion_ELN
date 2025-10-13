const showExampleLabel = () => {
  const prefix = document.querySelector('input#reaction-name-prefix')?.value;
  const counter = parseInt(document.querySelector('input#reactions-count')?.value, 10);
  const usernameAbbr = document.querySelector('input#name_abbreviation')?.value;
  const reactionLabel = `${usernameAbbr}-${prefix}${counter + 1}`;
  const label = document.querySelector('span#reaction-label-example');
  if (label) {
    label.textContent = reactionLabel;
  }
};

// Fill in label initially after page load
showExampleLabel();

// app/assets/javascripts/profile_form.js
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') return fn();
    document.addEventListener('DOMContentLoaded', fn);
  }

  function csrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta && meta.content;
  }

  ready(function () {
    const form = document.getElementById('profile-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const url = form.getAttribute('action'); // "/api/v1/profiles/:id"
      const token = csrfToken();

      const payload = { curation: Number(new FormData(form).get('profile[curation]')) };

      const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': token || ''
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      })
        .then(async (res) => {
          const ct = res.headers.get('Content-Type') || '';
          const body = ct.includes('application/json') ? await res.json() : await res.text();
          if (!res.ok) {
            const err = new Error('Request failed');
            err.status = res.status;
            err.body = body;
            throw err;
          }
          return body;
        })
        .then((_data) => {
          alert('Profile updated successfully.');
        })
        .catch((err) => {
          console.error(err);
          alert('There was a problem updating your profile.');
        })
        .finally(() => {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  });
})();

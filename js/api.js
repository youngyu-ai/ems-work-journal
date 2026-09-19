// EMS PWA 3.1
// Generated modular frontend.

const EMS_API_URL='https://script.google.com/macros/s/AKfycbx5tizEgp6f_7Rmx6jzorkDYddm-KwahOrjUNhwrDtN9Loq3ylnodUlV6cdMhneCVtw9Q/exec';
const EMS_API_TOKEN='BALING_EMS_2026';

function createGasApiShim() {
      if (window.google && window.google.script && window.google.script.run) return;
      const state = {success:null, failure:null};
      const handler = {
        get(target, prop) {
          if (prop === 'withSuccessHandler') return fn => { state.success = fn; return new Proxy({}, handler); };
          if (prop === 'withFailureHandler') return fn => { state.failure = fn; return new Proxy({}, handler); };
          return (payload) => {
            const request = {action:String(prop), token:EMS_API_TOKEN, data:payload || {}};
            fetch(EMS_API_URL, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(request)})
              .then(r => r.json())
              .then(result => { if (state.success) state.success(result); })
              .catch(err => { if (state.failure) state.failure(err); else console.error(err); });
          };
        }
      };
      window.google = window.google || {};
      window.google.script = window.google.script || {};
      window.google.script.run = new Proxy({}, handler);
    }
    createGasApiShim();

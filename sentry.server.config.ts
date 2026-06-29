// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://042b69d1df23baa92815561b480f3eee@o4510838621339648.ingest.de.sentry.io/4511585411399760",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Disable default PII collection for security
  sendDefaultPii: false,

  beforeSend(event) {
    if (event.request?.data) {
      delete event.request.data;
    }
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
    }
    return event;
  },
});

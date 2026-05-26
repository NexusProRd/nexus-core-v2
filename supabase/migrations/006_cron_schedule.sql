SELECT cron.schedule(
  'expire-gifts',
  '*/5 * * * *',
  $$SELECT handle_expired_gifts()$$
);

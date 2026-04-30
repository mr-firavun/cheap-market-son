/*
  # Add maintenance_mode platform setting

  Inserts the default maintenance_mode key with value 'false'.
  The app reads this on load; if 'true', visitors see a "coming soon" page.
  Admins bypass the maintenance screen and see the site normally.
*/
INSERT INTO platform_settings (key, value)
VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

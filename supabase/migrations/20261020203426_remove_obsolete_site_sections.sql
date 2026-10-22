/*
# Remove obsolete site sections

Removes Frequency, Inside Synf, and Secret Drops from the active site_sections registry.
These modules have been removed from the public website and admin panel.
Historical data in their respective tables is preserved but no longer managed as active site sections.

1. Changes
   - DELETE rows from site_sections WHERE key IN ('frequency', 'inside_synf', 'drops')
   - These sections will no longer appear in Admin → Site Sections
   - Their routes already fall through to the branded 404 page

2. Notes
   - No other data is affected
   - Remaining active sections: events, about, people, jobs, collaborate, contact, community, goods, pass
*/

DELETE FROM site_sections WHERE key IN ('frequency', 'inside_synf', 'drops');

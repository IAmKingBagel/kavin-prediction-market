-- Seed colleges (run once after schema.sql)
-- seed_no = 100 - seed_yes for each row

insert into colleges (id, name, status, seed_yes, seed_no) values
  ('berkeley', 'Berkeley', 'open', 10, 90),
  ('nyu', 'NYU', 'open', 9, 91),
  ('boston-college', 'Boston College', 'open', 13, 87),
  ('boston-university', 'Boston University', 'open', 22, 78),
  ('ut-austin', 'UT Austin', 'open', 22, 78),
  ('michigan', 'Michigan', 'open', 28, 72),
  ('uiuc-gies', 'UIUC - Gies College of Business', 'open', 30, 70),
  ('uga-terry', 'University of Georgia - Terry', 'open', 30, 70),
  ('uw-foster', 'University of Washington - Foster', 'open', 32, 68),
  ('ufl-warrington', 'University of Florida - Warrington', 'open', 28, 72),
  ('umd-smith', 'UMD Smith', 'open', 45, 55),
  ('iu-kelley', 'IU Kelley', 'open', 55, 45),
  ('rutgers', 'Rutgers', 'open', 65, 35),
  ('lehigh', 'LeHigh', 'open', 55, 45)
on conflict (id) do update set
  name = excluded.name,
  seed_yes = excluded.seed_yes,
  seed_no = excluded.seed_no;

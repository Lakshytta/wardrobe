-- "Lakshu wedding" celebration for My Wardrobe, with its sub-events (dates to be filled in the app). Idempotent.
insert into public.celebrations (id, profile_id, name, notes)
values ('1a4c5000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000001', 'Lakshu wedding', '')
on conflict (id) do nothing;
insert into public.events (id, profile_id, celebration_id, title, date, occasion, sort, people, notes, worn, options) values
('1a4c5000-0000-4000-8000-000000000101','5eed0000-0000-4000-8000-000000000001','1a4c5000-0000-4000-8000-000000000001','Gaur',null,'Puja',1,'{}','',false,'[]'),
('1a4c5000-0000-4000-8000-000000000102','5eed0000-0000-4000-8000-000000000001','1a4c5000-0000-4000-8000-000000000001','Haldi',null,'Haldi',2,'{}','',false,'[]'),
('1a4c5000-0000-4000-8000-000000000103','5eed0000-0000-4000-8000-000000000001','1a4c5000-0000-4000-8000-000000000001','Mehendi',null,'Mehendi',3,'{}','',false,'[]'),
('1a4c5000-0000-4000-8000-000000000104','5eed0000-0000-4000-8000-000000000001','1a4c5000-0000-4000-8000-000000000001','Welcome lunch',null,'Day function',4,'{}','',false,'[]'),
('1a4c5000-0000-4000-8000-000000000105','5eed0000-0000-4000-8000-000000000001','1a4c5000-0000-4000-8000-000000000001','Sangeet',null,'Sangeet',5,'{}','',false,'[]'),
('1a4c5000-0000-4000-8000-000000000106','5eed0000-0000-4000-8000-000000000001','1a4c5000-0000-4000-8000-000000000001','After party',null,'Evening/Party',6,'{}','',false,'[]'),
('1a4c5000-0000-4000-8000-000000000107','5eed0000-0000-4000-8000-000000000001','1a4c5000-0000-4000-8000-000000000001','Shaadi',null,'Wedding',7,'{}','',false,'[]'),
('1a4c5000-0000-4000-8000-000000000108','5eed0000-0000-4000-8000-000000000001','1a4c5000-0000-4000-8000-000000000001','Filler suit 1',null,'Day function',8,'{}','',false,'[]'),
('1a4c5000-0000-4000-8000-000000000109','5eed0000-0000-4000-8000-000000000001','1a4c5000-0000-4000-8000-000000000001','Filler suit 2',null,'Day function',9,'{}','',false,'[]')
on conflict (id) do nothing;

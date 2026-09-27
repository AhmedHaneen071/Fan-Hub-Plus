-- Attach playable demo MP3 sources to the four existing seeded audio records.
-- Does not change titles, ratings, categories, or other content fields.
UPDATE "Content" SET "media_url" = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' WHERE "title" = 'The Official Soundtrack Review' AND "type" = 'AUDIO' AND "media_url" IS NULL;
UPDATE "Content" SET "media_url" = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' WHERE "title" = 'The Sound of the Grid: Racing OSTs' AND "type" = 'AUDIO' AND "media_url" IS NULL;
UPDATE "Content" SET "media_url" = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' WHERE "title" = 'Score Sessions: Composers in the Studio' AND "type" = 'AUDIO' AND "media_url" IS NULL;
UPDATE "Content" SET "media_url" = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' WHERE "title" = 'The Album, Track-by-Track' AND "type" = 'AUDIO' AND "media_url" IS NULL;

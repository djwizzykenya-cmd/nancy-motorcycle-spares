INSERT INTO "categories" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES
    ('cat-engine-parts', 'Engine Parts', 'engine-parts', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-transmission', 'Transmission', 'transmission', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-suspension', 'Suspension', 'suspension', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-brakes', 'Brakes', 'brakes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-electrical', 'Electrical', 'electrical', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-tires-wheels', 'Tires & Wheels', 'tires-wheels', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-lights', 'Lights', 'lights', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-accessories', 'Accessories', 'accessories', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

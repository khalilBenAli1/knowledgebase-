-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    "eventDate" TIMESTAMP NOT NULL,
    location VARCHAR,
    "imageUrl" VARCHAR,
    published BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP,
    "createdById" UUID,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "FK_events_createdBy" FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL
);

-- Create event_form_fields table
CREATE TYPE event_form_field_fieldtype_enum AS ENUM('text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date', 'email', 'phone');

CREATE TABLE IF NOT EXISTS event_form_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label VARCHAR NOT NULL,
    "fieldType" event_form_field_fieldtype_enum NOT NULL DEFAULT 'text',
    required BOOLEAN NOT NULL DEFAULT false,
    options TEXT,
    placeholder VARCHAR,
    "order" INTEGER NOT NULL DEFAULT 0,
    "eventId" UUID,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "FK_event_form_fields_event" FOREIGN KEY ("eventId") REFERENCES events(id) ON DELETE CASCADE
);

-- Create event_registrations table
CREATE TYPE event_registration_status_enum AS ENUM('interested', 'going', 'not_going');

CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status event_registration_status_enum NOT NULL DEFAULT 'interested',
    "eventId" UUID,
    "userId" UUID,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "FK_event_registrations_event" FOREIGN KEY ("eventId") REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT "FK_event_registrations_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT "UQ_event_user" UNIQUE ("eventId", "userId")
);

-- Create event_registration_responses table
CREATE TABLE IF NOT EXISTS event_registration_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer TEXT NOT NULL,
    "registrationId" UUID,
    "formFieldId" UUID,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "FK_event_registration_responses_registration" FOREIGN KEY ("registrationId") REFERENCES event_registrations(id) ON DELETE CASCADE,
    CONSTRAINT "FK_event_registration_responses_formField" FOREIGN KEY ("formFieldId") REFERENCES event_form_fields(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "IDX_events_published" ON events (published);
CREATE INDEX IF NOT EXISTS "IDX_events_eventDate" ON events ("eventDate");
CREATE INDEX IF NOT EXISTS "IDX_event_form_fields_eventId" ON event_form_fields ("eventId");
CREATE INDEX IF NOT EXISTS "IDX_event_registrations_eventId" ON event_registrations ("eventId");
CREATE INDEX IF NOT EXISTS "IDX_event_registrations_userId" ON event_registrations ("userId");
CREATE INDEX IF NOT EXISTS "IDX_event_registration_responses_registrationId" ON event_registration_responses ("registrationId");
